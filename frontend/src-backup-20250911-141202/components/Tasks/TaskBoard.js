import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon
} from '../Icons';

const TaskBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignedToId: '',
    overdue: ''
  });
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchTasks();
  }, [searchTerm, filters]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.assignedToId && { assignedToId: filters.assignedToId }),
        ...(filters.overdue && { overdue: filters.overdue })
      });

      const response = await axios.get(`/tasks?${params}`);
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await axios.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, ...response.data } : task
        )
      );
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      HIGH: 'bg-red-100 text-red-800 border-red-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      LOW: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status) => {
    const icons = {
      PENDING: <ClockIcon className="h-5 w-5 text-gray-400" />,
      IN_PROGRESS: <ClockIcon className="h-5 w-5 text-blue-500" />,
      COMPLETED: <CheckCircleIcon className="h-5 w-5 text-green-500" />
    };
    return icons[status] || icons.PENDING;
  };

  const isOverdue = (dueDate) => {
    return dueDate && new Date(dueDate) < new Date() && !tasks.find(t => t.id === taskId && t.status === 'COMPLETED');
  };

  const tasksByStatus = {
    PENDING: tasks.filter(task => task.status === 'PENDING'),
    IN_PROGRESS: tasks.filter(task => task.status === 'IN_PROGRESS'),
    COMPLETED: tasks.filter(task => task.status === 'COMPLETED')
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage tasks and track progress across all cases.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            New Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              >
                <option value="">All Priority</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Overdue Filter */}
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                value={filters.overdue}
                onChange={(e) => setFilters({ ...filters, overdue: e.target.value })}
              >
                <option value="">All Tasks</option>
                <option value="true">Overdue Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-lg font-medium text-gray-900">{tasksByStatus.PENDING.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                  <dd className="text-lg font-medium text-gray-900">{tasksByStatus.IN_PROGRESS.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">{tasksByStatus.COMPLETED.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Overdue</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {tasks.filter(task => isOverdue(task.dueDate) && task.status !== 'COMPLETED').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pending Column */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
              Pending ({tasksByStatus.PENDING.length})
            </h3>
          </div>
          <div className="space-y-3">
            {tasksByStatus.PENDING.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={updateTaskStatus}
                isOverdue={isOverdue(task.dueDate)}
              />
            ))}
            {tasksByStatus.PENDING.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No pending tasks</p>
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ClockIcon className="h-5 w-5 text-blue-500 mr-2" />
              In Progress ({tasksByStatus.IN_PROGRESS.length})
            </h3>
          </div>
          <div className="space-y-3">
            {tasksByStatus.IN_PROGRESS.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={updateTaskStatus}
                isOverdue={isOverdue(task.dueDate)}
              />
            ))}
            {tasksByStatus.IN_PROGRESS.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No tasks in progress</p>
            )}
          </div>
        </div>

        {/* Completed Column */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              Completed ({tasksByStatus.COMPLETED.length})
            </h3>
          </div>
          <div className="space-y-3">
            {tasksByStatus.COMPLETED.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={updateTaskStatus}
                isOverdue={false}
              />
            ))}
            {tasksByStatus.COMPLETED.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No completed tasks</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Task Card Component
const TaskCard = ({ task, onStatusChange, isOverdue }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow ${
      isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">{task.title}</h4>
          {task.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </div>

      {task.case && (
        <div className="flex items-center text-xs text-gray-500 mb-2">
          <span className="truncate">{task.case.title}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          {task.dueDate && (
            <div className={`flex items-center ${isOverdue ? 'text-red-600' : ''}`}>
              <CalendarIcon className="h-3 w-3 mr-1" />
              {new Date(task.dueDate).toLocaleDateString()}
              {isOverdue && <ExclamationTriangleIcon className="h-3 w-3 ml-1 text-red-500" />}
            </div>
          )}
          {task.assignedTo && (
            <div className="flex items-center">
              <UserIcon className="h-3 w-3 mr-1" />
              {task.assignedTo.firstName} {task.assignedTo.lastName}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          {getStatusIcon(task.status)}
          <span className="text-xs text-gray-600 capitalize">{task.status.replace('_', ' ').toLowerCase()}</span>
        </div>
        
        <div className="flex space-x-1">
          {task.status === 'PENDING' && (
            <button
              onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
            >
              Start
            </button>
          )}
          {task.status === 'IN_PROGRESS' && (
            <button
              onClick={() => onStatusChange(task.id, 'COMPLETED')}
              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
            >
              Complete
            </button>
          )}
          {task.status === 'COMPLETED' && (
            <button
              onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}
              className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function moved outside component to avoid re-creation
const getPriorityColor = (priority) => {
  const colors = {
    HIGH: 'bg-red-100 text-red-800 border-red-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    LOW: 'bg-green-100 text-green-800 border-green-200'
  };
  return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export default TaskBoard;