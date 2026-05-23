const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all medical records
exports.getMedicalRecords = async (req, res) => {
  try {
    const { caseId, providerId, requested, received, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let where = {};
    if (caseId) where.caseId = caseId;
    if (providerId) where.providerId = providerId;
    if (requested !== undefined) where.requested = requested === 'true';
    if (received !== undefined) where.received = received === 'true';

    const medicalRecords = await prisma.medicalRecord.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        case: {
          select: {
            title: true,
            caseNumber: true,
            client: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        provider: true
      },
      orderBy: {
        dateOfService: 'desc'
      }
    });

    const total = await prisma.medicalRecord.count({ where });

    res.json({
      medicalRecords,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create medical record
exports.createMedicalRecord = async (req, res) => {
  try {
    const {
      caseId,
      providerId,
      dateOfService,
      typeOfService,
      description,
      cost,
      notes
    } = req.body;

    const medicalRecord = await prisma.medicalRecord.create({
      data: {
        caseId,
        providerId,
        dateOfService: new Date(dateOfService),
        typeOfService,
        description,
        cost: cost ? parseFloat(cost) : null,
        notes
      },
      include: {
        case: {
          select: {
            title: true,
            caseNumber: true
          }
        },
        provider: true
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        action: 'CREATE',
        description: `Created medical record for ${typeOfService}`,
        entityType: 'MEDICAL_RECORD',
        entityId: medicalRecord.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json(medicalRecord);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update medical record
exports.updateMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.dateOfService) {
      updateData.dateOfService = new Date(updateData.dateOfService);
    }
    if (updateData.dateRequested) {
      updateData.dateRequested = new Date(updateData.dateRequested);
    }
    if (updateData.dateReceived) {
      updateData.dateReceived = new Date(updateData.dateReceived);
    }
    if (updateData.cost) {
      updateData.cost = parseFloat(updateData.cost);
    }

    const medicalRecord = await prisma.medicalRecord.update({
      where: { id },
      data: updateData,
      include: {
        case: {
          select: {
            title: true,
            caseNumber: true
          }
        },
        provider: true
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        action: 'UPDATE',
        description: `Updated medical record for ${medicalRecord.typeOfService}`,
        entityType: 'MEDICAL_RECORD',
        entityId: medicalRecord.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json(medicalRecord);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Medical record not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Update record request status
exports.updateRecordStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { requested, received, dateRequested, dateReceived } = req.body;

    const updateData = {};
    if (requested !== undefined) {
      updateData.requested = requested;
      if (requested && !dateRequested) {
        updateData.dateRequested = new Date();
      }
    }
    if (received !== undefined) {
      updateData.received = received;
      if (received && !dateReceived) {
        updateData.dateReceived = new Date();
      }
    }
    if (dateRequested) updateData.dateRequested = new Date(dateRequested);
    if (dateReceived) updateData.dateReceived = new Date(dateReceived);

    const medicalRecord = await prisma.medicalRecord.update({
      where: { id },
      data: updateData,
      include: {
        provider: true,
        case: {
          select: {
            title: true,
            caseNumber: true
          }
        }
      }
    });

    // Log activity
    const status = received ? 'received' : requested ? 'requested' : 'updated';
    await prisma.activity.create({
      data: {
        action: 'STATUS_UPDATE',
        description: `Medical record ${status} from ${medicalRecord.provider.name}`,
        entityType: 'MEDICAL_RECORD',
        entityId: medicalRecord.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json(medicalRecord);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Medical record not found' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Get case medical records
exports.getCaseMedicalRecords = async (req, res) => {
  try {
    const { id } = req.params;

    const medicalRecords = await prisma.medicalRecord.findMany({
      where: { caseId: id },
      include: {
        provider: true
      },
      orderBy: {
        dateOfService: 'desc'
      }
    });

    // Get summary statistics
    const stats = {
      total: medicalRecords.length,
      requested: medicalRecords.filter(record => record.requested).length,
      received: medicalRecords.filter(record => record.received).length,
      pending: medicalRecords.filter(record => record.requested && !record.received).length,
      totalCost: medicalRecords.reduce((sum, record) => 
        sum + parseFloat(record.cost || 0), 0
      )
    };

    // Group by provider
    const byProvider = medicalRecords.reduce((acc, record) => {
      const providerId = record.providerId;
      if (!acc[providerId]) {
        acc[providerId] = {
          provider: record.provider,
          records: [],
          count: 0,
          totalCost: 0
        };
      }
      acc[providerId].records.push(record);
      acc[providerId].count++;
      acc[providerId].totalCost += parseFloat(record.cost || 0);
      return acc;
    }, {});

    res.json({
      medicalRecords,
      stats,
      byProvider: Object.values(byProvider)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get medical providers
exports.getMedicalProviders = async (req, res) => {
  try {
    const { search, type, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (type) {
      where.type = type;
    }

    const providers = await prisma.medicalProvider.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        _count: {
          medicalRecords: true,
          cases: true
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const total = await prisma.medicalProvider.count({ where });

    res.json({
      providers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create medical provider
exports.createMedicalProvider = async (req, res) => {
  try {
    const {
      name,
      type,
      address,
      phone,
      fax,
      email,
      contactPerson
    } = req.body;

    const provider = await prisma.medicalProvider.create({
      data: {
        name,
        type,
        address,
        phone,
        fax,
        email,
        contactPerson
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        action: 'CREATE',
        description: `Created medical provider: ${name}`,
        entityType: 'MEDICAL_PROVIDER',
        entityId: provider.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json(provider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update medical provider
exports.updateMedicalProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const provider = await prisma.medicalProvider.update({
      where: { id },
      data: updateData
    });

    // Log activity
    await prisma.activity.create({
      data: {
        action: 'UPDATE',
        description: `Updated medical provider: ${provider.name}`,
        entityType: 'MEDICAL_PROVIDER',
        entityId: provider.id,
        userId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json(provider);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Medical provider not found' });
    }
    res.status(500).json({ error: error.message });
  }
};