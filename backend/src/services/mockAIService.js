class MockAIDocumentService {
  constructor() {
    this.mockDocuments = {
      SETTLEMENT_AGREEMENT: `SETTLEMENT AGREEMENT AND RELEASE

This Settlement Agreement and Release ("Agreement") is entered into on {settlementDate} by and between {clientName} ("Claimant") and [Insurance Company/Defendant] ("Releasee").

RECITALS

WHEREAS, Claimant sustained injuries and damages in connection with a {caseType} that occurred on [Date of Incident];

WHEREAS, the parties desire to settle and resolve all claims, disputes, and controversies arising out of or relating to said incident;

NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, the parties agree as follows:

1. SETTLEMENT PAYMENT
   Releasee agrees to pay Claimant the sum of {settlementAmount} ("Settlement Amount") in full settlement of all claims.

2. PAYMENT TERMS
   The Settlement Amount shall be paid as follows:
   - Total Settlement: {settlementAmount}
   - Attorney Fees: {attorneyFees}
   - Case Costs: {costs}
   - Net Payment to Client: {netToClient}

3. RELEASE OF CLAIMS
   In consideration for the Settlement Amount, Claimant hereby releases, acquits, and forever discharges Releasee from any and all claims, demands, damages, actions, causes of action, suits, and liabilities of every kind and nature whatsoever.

4. CONFIDENTIALITY
   The parties agree to keep the terms of this Settlement Agreement confidential.

5. GOVERNING LAW
   This Agreement shall be governed by and construed in accordance with the laws of [State].

IN WITNESS WHEREOF, the parties have executed this Agreement on the date first written above.

_____________________          _____________________
{clientName}                   [Insurance Representative]
Claimant                       Releasee

_____________________
{attorney}
Attorney for Claimant`,

      DEMAND_LETTER: `[Law Firm Letterhead]
[Date]

[Insurance Company Name]
[Claims Department]
[Address]

Re: Claim for {clientName}
    Date of Loss: [Date]
    Your Insured: [Defendant Name]
    Claimant: {clientName}

Dear Claims Representative:

I represent {clientName} in connection with the {caseType} that occurred on [Date of Incident]. This letter serves as a formal demand for settlement of Mr./Ms. {clientName}'s claims.

FACTS OF THE INCIDENT

{description}

LIABILITY

Your insured was clearly negligent in this matter. The evidence demonstrates that your insured failed to exercise reasonable care, directly causing the injuries and damages sustained by my client.

DAMAGES

My client sustained significant injuries as a result of this incident, including:

• Medical expenses to date: $[Amount]
• Lost wages: $[Amount]  
• Pain and suffering: $[Amount]
• Future medical expenses: $[Amount]

Based on the clear liability of your insured and the substantial damages sustained by my client, we hereby demand payment of {demandAmount} to resolve this matter.

This offer remains open for thirty (30) days from the date of this letter. If we do not receive a response within this timeframe, we will assume you are not interested in settlement and will proceed accordingly.

Please contact me immediately to discuss resolution of this claim.

Very truly yours,

{attorney}
Attorney for {clientName}`,

      DISCOVERY_REQUEST: `IN THE CIRCUIT COURT OF [COUNTY]
STATE OF [STATE]

{clientName},                    )
                                )
    Plaintiff,                  )    Case No. [Case Number]
                                )
v.                             )
                                )
[Defendant Name],               )
                                )
    Defendant.                  )

PLAINTIFF'S FIRST SET OF INTERROGATORIES TO DEFENDANT

TO: [Defendant Name], Defendant in the above-styled cause:

Plaintiff {clientName} hereby propounds the following Interrogatories to be answered under oath within thirty (30) days of service hereof.

DEFINITIONS AND INSTRUCTIONS

1. "You" or "your" means the Defendant and all persons acting on behalf of Defendant.
2. "The incident" refers to the {caseType} that occurred on [Date of Incident].
3. Each Interrogatory shall be answered completely and under oath.

INTERROGATORIES

1. State your full name, current address, telephone number, date of birth, and Social Security number.

2. Describe in detail how the incident occurred, including all facts within your knowledge.

3. Identify all witnesses to the incident, including their names, addresses, and telephone numbers.

4. List all insurance policies that may provide coverage for this incident.

5. Describe any statements you made regarding the incident, whether oral or written.

6. Identify all documents in your possession relating to this incident.

7. State whether you have ever been involved in a similar incident, and if so, provide details.

8. Describe your version of the events leading up to, during, and immediately following the incident.

Respectfully submitted,

{attorney}
Attorney for Plaintiff
[Bar Number]`,

      LEGAL_BRIEF: `IN THE [COURT NAME]
[JURISDICTION]

{clientName},                    )
                                )
    [Plaintiff/Appellant],      )    Case No. [Case Number]
                                )
v.                             )
                                )
[Opposing Party],               )
                                )
    [Defendant/Appellee].       )

BRIEF IN SUPPORT OF [MOTION/POSITION]

TABLE OF CONTENTS

I.    Statement of the Issues
II.   Statement of Facts  
III.  Summary of Argument
IV.   Argument
V.    Conclusion

I. STATEMENT OF THE ISSUES

{legalIssue}

II. STATEMENT OF FACTS

{keyFacts}

III. SUMMARY OF ARGUMENT

The evidence clearly establishes that {clientPosition}. The applicable law supports this position based on established precedent and statutory authority.

IV. ARGUMENT

A. [Legal Standard/Framework]

The court should apply the standard set forth in [Case Citation], which holds that [legal principle]. This standard requires [analysis framework].

B. [Application to Facts]

Under this standard, the facts of this case clearly demonstrate that [argument]. The evidence shows [supporting facts].

The controlling authority in [Case Citation] is directly on point and supports {clientName}'s position. In that case, the court held [holding], which applies here because [factual similarity].

V. CONCLUSION

For the foregoing reasons, this Court should [requested relief] in favor of {clientName}.

Respectfully submitted,

{attorney}
Attorney for {clientName}
[Bar Number]`,

      CLIENT_INTAKE_FORM: `CLIENT INTAKE FORM
{practiceAreas}

CLIENT INFORMATION
Name: _________________________________ Date: __________
Address: __________________________________________________________
City: _____________ State: ______ ZIP: ________
Phone: (Home) _____________ (Work) _____________ (Cell) _____________
Email: ___________________________
Date of Birth: ___________  SSN: _______________
Emergency Contact: ___________________________ Phone: ___________

CASE INFORMATION - {caseType}
Date of Incident: ___________  Time: ___________
Location of Incident: _________________________________________
Brief Description: ___________________________________________
____________________________________________________________

MEDICAL INFORMATION (if applicable)
Were you injured? □ Yes □ No
If yes, describe injuries: ___________________________________
Did you seek medical treatment? □ Yes □ No
Hospital/Doctor visited: ____________________________________
Are you still receiving treatment? □ Yes □ No

EMPLOYMENT INFORMATION  
Employer: ______________ Position: ______________
Work Phone: _____________ Annual Income: $_________
Did this incident affect your work? □ Yes □ No
If yes, how? _______________________________________________

INSURANCE INFORMATION
Auto Insurance: _______________________ Policy #: __________
Health Insurance: _____________________ Policy #: __________
Other Insurance: ______________________ Policy #: __________

WITNESS INFORMATION
Name: _________________________ Phone: __________________
Address: ______________________________________________
Name: _________________________ Phone: __________________
Address: ______________________________________________

LEGAL HISTORY
Have you ever hired an attorney? □ Yes □ No
If yes, for what matter? ___________________________________
Are you involved in any other legal matters? □ Yes □ No

DOCUMENTS TO PROVIDE
□ Police Report    □ Medical Records    □ Insurance Cards
□ Pay Stubs       □ Photos            □ Correspondence

I certify that the information provided is true and accurate.

Client Signature: _________________________ Date: __________`,

      CONTRACT_REVIEW: `CONTRACT REVIEW MEMORANDUM

TO: {clientName}
FROM: {attorney}
DATE: [Current Date]
RE: Contract Review - {contractType}

EXECUTIVE SUMMARY

This memorandum provides a comprehensive review of the {contractType} contract. Overall, the contract presents [moderate/high/low] risk to your interests with several areas requiring attention.

KEY FINDINGS
• [Key Risk 1]
• [Key Risk 2] 
• [Key Benefit 1]
• [Missing Protection]

DETAILED ANALYSIS

1. CONTRACT TERMS
   The primary obligations include [main terms]. The performance standards are [assessment].

2. RISK ASSESSMENT
   High Risk Areas:
   • [Specific clause] - This provision could result in [consequence]
   • [Another clause] - Consider the impact of [issue]

   Moderate Risk Areas:
   • [Clause] - While not immediately concerning, this could [potential issue]

3. MISSING PROVISIONS
   The contract should include:
   • [Missing protection 1]
   • [Missing protection 2]
   • [Standard clause not present]

4. RECOMMENDED REVISIONS
   • Modify Section [X] to include [protection]
   • Add termination clause allowing [flexibility]
   • Include limitation of liability provision
   • Clarify dispute resolution mechanism

5. NEGOTIATION STRATEGY
   Priority 1: [Most important change]
   Priority 2: [Second most important]
   Priority 3: [Nice to have changes]

CONCLUSION

I recommend [proceed with revisions/reject/negotiate further] based on the analysis above. Please contact me to discuss these recommendations and develop a negotiation strategy.

{attorney}
Contract Review Attorney`
    };

    this.usageTracking = {
      mock: { requests: 0, tokens: 0, cost: 0 }
    };

    console.log('🤖 Mock AI Service initialized - Demo mode active');
  }

  async generateDocument(documentType, templateData, preferredProvider = null) {
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

      const template = this.mockDocuments[documentType];
      if (!template) {
        throw new Error(`Unknown document type: ${documentType}`);
      }

      // Replace template variables
      let document = template;
      for (const [key, value] of Object.entries(templateData)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        document = document.replace(regex, value || `[${key}]`);
      }

      const provider = preferredProvider || 'mock-ai';
      const tokenCount = Math.ceil(document.length / 4);

      // Track usage
      this.usageTracking.mock.requests++;
      this.usageTracking.mock.tokens += tokenCount;
      this.usageTracking.mock.cost += 0.001; // Fake cost for demo

      console.log(`🤖 Generated ${documentType} using ${provider} (DEMO MODE)`);

      return {
        success: true,
        document,
        metadata: {
          documentType,
          provider,
          generationTime: 2000,
          timestamp: new Date().toISOString(),
          tokenCount,
          demoMode: true
        }
      };

    } catch (error) {
      console.error(`Error generating document (${documentType}):`, error);
      return {
        success: false,
        error: error.message,
        documentType
      };
    }
  }

  selectProvider(documentType, preferredProvider = null) {
    return {
      name: 'mock-ai',
      model: 'demo-model'
    };
  }

  getUsageStats() {
    return {
      providers: ['mock-ai'],
      usage: this.usageTracking,
      totalRequests: this.usageTracking.mock.requests,
      totalCost: this.usageTracking.mock.cost,
      demoMode: true
    };
  }

  getAvailableDocumentTypes() {
    return Object.keys(this.mockDocuments).map(type => ({
      type,
      preferredProvider: 'mock-ai',
      available: true,
      demoMode: true
    }));
  }

  async testProviderConnection(providerName) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      provider: 'mock-ai',
      response: 'Demo mode active - AI providers simulated',
      timestamp: new Date().toISOString(),
      demoMode: true
    };
  }
}

module.exports = MockAIDocumentService;