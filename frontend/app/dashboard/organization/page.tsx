'use client';

import { useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import {
  useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
  type Department
} from '@/hooks/useDepartments';
import {
  usePositions, useCreatePosition, useUpdatePosition, useDeletePosition,
  type Position
} from '@/hooks/usePositions';
import {
  useJobBands, useCreateJobBand, useUpdateJobBand, useDeleteJobBand,
  type JobBand
} from '@/hooks/useJobBands';
import {
  useJobGrades, useCreateJobGrade, useUpdateJobGrade, useDeleteJobGrade,
  type JobGrade
} from '@/hooks/useJobGrades';
import {
  useTasks, useCreateTask, useUpdateTask, useDeleteTask,
  type Task
} from '@/hooks/useTasks';
import {
  useWorkerGroups, useCreateWorkerGroup, useUpdateWorkerGroup, useDeleteWorkerGroup,
  type WorkerGroup
} from '@/hooks/useWorkerGroups';
import {
  BuildingOfficeIcon,
  BriefcaseIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

type TabType = 'departments' | 'positions' | 'job-structure' | 'groups' | 'tasks';

export default function OrganizationPage() {
  const { selectedCompany } = useCompany();
  const [activeTab, setActiveTab] = useState<TabType>('departments');

  // Filter states for each tab
  const [departmentFilter, setDepartmentFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [positionFilter, setPositionFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [jobBandFilter, setJobBandFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [jobGradeFilter, setJobGradeFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [groupFilter, setGroupFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Modal states
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [showJobBandModal, setShowJobBandModal] = useState(false);
  const [showJobGradeModal, setShowJobGradeModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedJobBand, setSelectedJobBand] = useState<JobBand | null>(null);
  const [selectedJobGrade, setSelectedJobGrade] = useState<JobGrade | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<WorkerGroup | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch ALL data (no filtering on backend - we'll filter on frontend for accurate counts)
  const { data: allDepartments = [], isLoading: departmentsLoading } = useDepartments(selectedCompany?._id);
  const { data: allPositions = [], isLoading: positionsLoading } = usePositions(selectedCompany?._id);
  const { data: allJobBands = [], isLoading: jobBandsLoading } = useJobBands(selectedCompany?._id);
  const { data: allJobGrades = [], isLoading: jobGradesLoading } = useJobGrades(selectedCompany?._id);
  const { data: allGroups = [], isLoading: groupsLoading } = useWorkerGroups(selectedCompany?._id);
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks(selectedCompany?._id);

  // Filter data on frontend based on filter state
  const departments = departmentFilter === 'all'
    ? allDepartments
    : allDepartments.filter((d: Department) => d.isActive === (departmentFilter === 'active'));

  const positions = positionFilter === 'all'
    ? allPositions
    : allPositions.filter((p: Position) => p.isActive === (positionFilter === 'active'));

  const jobBands = jobBandFilter === 'all'
    ? allJobBands
    : allJobBands.filter((b: JobBand) => b.isActive === (jobBandFilter === 'active'));

  const jobGrades = jobGradeFilter === 'all'
    ? allJobGrades
    : allJobGrades.filter((g: JobGrade) => g.isActive === (jobGradeFilter === 'active'));

  const groups = groupFilter === 'all'
    ? allGroups
    : allGroups.filter((g: WorkerGroup) => g.isActive === (groupFilter === 'active'));

  const tasks = taskFilter === 'all'
    ? allTasks
    : allTasks.filter((t: Task) => t.isActive === (taskFilter === 'active'));

  // Mutations
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const createPosition = useCreatePosition();
  const updatePosition = useUpdatePosition();
  const deletePosition = useDeletePosition();

  const createJobBand = useCreateJobBand();
  const updateJobBand = useUpdateJobBand();
  const deleteJobBand = useDeleteJobBand();

  const createJobGrade = useCreateJobGrade();
  const updateJobGrade = useUpdateJobGrade();
  const deleteJobGrade = useDeleteJobGrade();

  const createGroup = useCreateWorkerGroup();
  const updateGroup = useUpdateWorkerGroup();
  const deleteGroup = useDeleteWorkerGroup();

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // Handlers for Departments
  const handleAddDepartment = () => {
    setSelectedDepartment(null);
    setShowDepartmentModal(true);
  };

  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setShowDepartmentModal(true);
  };

  const handleDeleteDepartment = async (id: string) => {
    if (confirm('Are you sure you want to delete this department?')) {
      await deleteDepartment.mutateAsync(id);
    }
  };

  const handleSaveDepartment = async (data: Partial<Department>) => {
    if (selectedDepartment) {
      await updateDepartment.mutateAsync({ id: selectedDepartment._id, data });
    } else {
      await createDepartment.mutateAsync({ ...data, company: selectedCompany!._id });
    }
    setShowDepartmentModal(false);
  };

  // Handlers for Positions
  const handleAddPosition = () => {
    setSelectedPosition(null);
    setShowPositionModal(true);
  };

  const handleEditPosition = (position: Position) => {
    setSelectedPosition(position);
    setShowPositionModal(true);
  };

  const handleDeletePosition = async (id: string) => {
    if (confirm('Are you sure you want to delete this position?')) {
      await deletePosition.mutateAsync(id);
    }
  };

  const handleSavePosition = async (data: Partial<Position>) => {
    if (selectedPosition) {
      await updatePosition.mutateAsync({ id: selectedPosition._id, data });
    } else {
      await createPosition.mutateAsync({ ...data, company: selectedCompany!._id });
    }
    setShowPositionModal(false);
  };

  // Handlers for Job Bands
  const handleAddJobBand = () => {
    setSelectedJobBand(null);
    setShowJobBandModal(true);
  };

  const handleEditJobBand = (jobBand: JobBand) => {
    setSelectedJobBand(jobBand);
    setShowJobBandModal(true);
  };

  const handleDeleteJobBand = async (id: string) => {
    if (confirm('Are you sure you want to delete this job band?')) {
      await deleteJobBand.mutateAsync(id);
    }
  };

  const handleSaveJobBand = async (data: Partial<JobBand>) => {
    if (selectedJobBand) {
      await updateJobBand.mutateAsync({ id: selectedJobBand._id, data });
    } else {
      await createJobBand.mutateAsync({ ...data, company: selectedCompany!._id });
    }
    setShowJobBandModal(false);
  };

  // Handlers for Job Grades
  const handleAddJobGrade = () => {
    setSelectedJobGrade(null);
    setShowJobGradeModal(true);
  };

  const handleEditJobGrade = (jobGrade: JobGrade) => {
    setSelectedJobGrade(jobGrade);
    setShowJobGradeModal(true);
  };

  const handleDeleteJobGrade = async (id: string) => {
    if (confirm('Are you sure you want to delete this job grade?')) {
      await deleteJobGrade.mutateAsync(id);
    }
  };

  const handleSaveJobGrade = async (data: Partial<JobGrade>) => {
    if (selectedJobGrade) {
      await updateJobGrade.mutateAsync({ id: selectedJobGrade._id, data });
    } else {
      await createJobGrade.mutateAsync({ ...data, company: selectedCompany!._id });
    }
    setShowJobGradeModal(false);
  };

  // Handlers for Groups
  const handleAddGroup = () => {
    setSelectedGroup(null);
    setShowGroupModal(true);
  };

  const handleEditGroup = (group: WorkerGroup) => {
    setSelectedGroup(group);
    setShowGroupModal(true);
  };

  const handleDeleteGroup = async (id: string) => {
    if (confirm('Are you sure you want to delete this group?')) {
      await deleteGroup.mutateAsync(id);
    }
  };

  const handleSaveGroup = async (data: Partial<WorkerGroup>) => {
    if (selectedGroup) {
      await updateGroup.mutateAsync({ id: selectedGroup._id, data });
    } else {
      await createGroup.mutateAsync({ ...data, company: selectedCompany!._id });
    }
    setShowGroupModal(false);
  };

  // Handlers for Tasks
  const handleAddTask = () => {
    setSelectedTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask.mutateAsync(id);
    }
  };

  const handleSaveTask = async (data: Partial<Task>) => {
    if (selectedTask) {
      await updateTask.mutateAsync({ id: selectedTask._id, data });
    } else {
      await createTask.mutateAsync({ ...data, company: selectedCompany!._id });
    }
    setShowTaskModal(false);
  };

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please select a company to manage organizational structure.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Organizational Structure</h1>
          <p className="mt-1 text-xs md:text-sm text-gray-500">
            Manage departments, positions, job bands, job grades, and tasks
          </p>
        </div>
      </div>

      {/* Tabs - Scrollable on mobile */}
      <div className="border-b border-gray-200 overflow-x-auto scrollbar-hide">
        <nav className="-mb-px flex space-x-3 md:space-x-8 min-w-max">
          <button
            onClick={() => setActiveTab('departments')}
            className={`${
              activeTab === 'departments'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm flex items-center gap-1 md:gap-2`}
          >
            <BuildingOfficeIcon className="h-4 w-4 md:h-5 md:w-5" />
            <span className="hidden sm:inline">Departments</span>
            <span className="sm:hidden">Depts</span>
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`${
              activeTab === 'positions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm flex items-center gap-1 md:gap-2`}
          >
            <BriefcaseIcon className="h-4 w-4 md:h-5 md:w-5" />
            <span className="hidden sm:inline">Positions</span>
            <span className="sm:hidden">Pos</span>
          </button>
          <button
            onClick={() => setActiveTab('job-structure')}
            className={`${
              activeTab === 'job-structure'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm flex items-center gap-1 md:gap-2`}
          >
            <ChartBarIcon className="h-4 w-4 md:h-5 md:w-5" />
            <span className="hidden sm:inline">Job Bands & Grades</span>
            <span className="sm:hidden">Job Bands</span>
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`${
              activeTab === 'groups'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm flex items-center gap-1 md:gap-2`}
          >
            <UserGroupIcon className="h-4 w-4 md:h-5 md:w-5" />
            Groups
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`${
              activeTab === 'tasks'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm flex items-center gap-1 md:gap-2`}
          >
            <ClipboardDocumentListIcon className="h-4 w-4 md:h-5 md:w-5" />
            Tasks
          </button>
        </nav>
      </div>

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <DepartmentsTab
          departments={departments}
          allDepartments={allDepartments}
          isLoading={departmentsLoading}
          filter={departmentFilter}
          setFilter={setDepartmentFilter}
          onAdd={handleAddDepartment}
          onEdit={handleEditDepartment}
          onDelete={handleDeleteDepartment}
        />
      )}

      {/* Positions Tab */}
      {activeTab === 'positions' && (
        <PositionsTab
          positions={positions}
          allPositions={allPositions}
          departments={allDepartments}
          jobBands={allJobBands}
          jobGrades={allJobGrades}
          isLoading={positionsLoading}
          filter={positionFilter}
          setFilter={setPositionFilter}
          onAdd={handleAddPosition}
          onEdit={handleEditPosition}
          onDelete={handleDeletePosition}
        />
      )}

      {/* Job Structure Tab (Bands & Grades Combined) */}
      {activeTab === 'job-structure' && (
        <JobStructureTab
          jobBands={jobBands}
          allJobBands={allJobBands}
          jobGrades={jobGrades}
          allJobGrades={allJobGrades}
          isLoadingBands={jobBandsLoading}
          isLoadingGrades={jobGradesLoading}
          bandFilter={jobBandFilter}
          gradeFilter={jobGradeFilter}
          setBandFilter={setJobBandFilter}
          setGradeFilter={setJobGradeFilter}
          onAddBand={handleAddJobBand}
          onEditBand={handleEditJobBand}
          onDeleteBand={handleDeleteJobBand}
          onAddGrade={handleAddJobGrade}
          onEditGrade={handleEditJobGrade}
          onDeleteGrade={handleDeleteJobGrade}
        />
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <GroupsTab
          groups={groups}
          allGroups={allGroups}
          isLoading={groupsLoading}
          filter={groupFilter}
          setFilter={setGroupFilter}
          onAdd={handleAddGroup}
          onEdit={handleEditGroup}
          onDelete={handleDeleteGroup}
        />
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <TasksTab
          tasks={tasks}
          allTasks={allTasks}
          isLoading={tasksLoading}
          filter={taskFilter}
          setFilter={setTaskFilter}
          onAdd={handleAddTask}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
        />
      )}

      {/* Modals */}
      {showDepartmentModal && (
        <DepartmentFormModal
          department={selectedDepartment}
          departments={departments}
          onClose={() => setShowDepartmentModal(false)}
          onSave={handleSaveDepartment}
        />
      )}

      {showPositionModal && (
        <PositionFormModal
          position={selectedPosition}
          departments={departments}
          jobBands={jobBands}
          jobGrades={jobGrades}
          positions={positions}
          onClose={() => setShowPositionModal(false)}
          onSave={handleSavePosition}
        />
      )}

      {showJobBandModal && (
        <JobBandFormModal
          jobBand={selectedJobBand}
          onClose={() => setShowJobBandModal(false)}
          onSave={handleSaveJobBand}
        />
      )}

      {showJobGradeModal && (
        <JobGradeFormModal
          jobGrade={selectedJobGrade}
          jobBands={jobBands}
          onClose={() => setShowJobGradeModal(false)}
          onSave={handleSaveJobGrade}
        />
      )}

      {showGroupModal && (
        <GroupFormModal
          group={selectedGroup}
          onClose={() => setShowGroupModal(false)}
          onSave={handleSaveGroup}
        />
      )}

      {showTaskModal && (
        <TaskFormModal
          task={selectedTask}
          onClose={() => setShowTaskModal(false)}
          onSave={handleSaveTask}
        />
      )}
    </div>
  );
}

// Departments Tab Component
function DepartmentsTab({ departments, allDepartments, isLoading, filter, setFilter, onAdd, onEdit, onDelete }: {
  departments: Department[];
  allDepartments: Department[];
  isLoading: boolean;
  filter: 'all' | 'active' | 'inactive';
  setFilter: (filter: 'all' | 'active' | 'inactive') => void;
  onAdd: () => void;
  onEdit: (department: Department) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-3 md:space-y-4">
      {/* Filter Tabs and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-0.5 md:p-1 inline-flex overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-md font-medium transition-colors text-xs md:text-sm whitespace-nowrap ${
              filter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({allDepartments.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-md font-medium transition-colors text-xs md:text-sm whitespace-nowrap ${
              filter === 'active' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Active ({allDepartments.filter((d: Department) => d.isActive).length})
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-md font-medium transition-colors text-xs md:text-sm whitespace-nowrap ${
              filter === 'inactive' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Inactive ({allDepartments.filter((d: Department) => !d.isActive).length})
          </button>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center px-2.5 py-1.5 md:px-4 md:py-2 border border-transparent text-xs md:text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Add Department</span>
          <span className="sm:hidden">Add Dept</span>
        </button>
      </div>

      {/* Departments Table */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : departments.length === 0 ? (
        <div className="text-center py-8 md:py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <BuildingOfficeIcon className="mx-auto h-10 w-10 md:h-12 md:w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No departments</h3>
          <p className="mt-1 text-xs md:text-sm text-gray-500">Get started by creating a new department.</p>
          <div className="mt-4 md:mt-6">
            <button
              onClick={onAdd}
              className="inline-flex items-center px-3 py-1.5 md:px-4 md:py-2 border border-transparent shadow-sm text-xs md:text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 md:h-5 md:w-5 mr-1.5 md:mr-2" />
              Add Department
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parent Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="sticky right-0 bg-gray-50 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {departments.map((department) => {
                const parentDept = departments.find(d => d._id === department.parentDepartment);
                return (
                  <tr key={department._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-5 w-5 text-indigo-600 mr-2" />
                        <div className="text-sm font-medium text-gray-900">{department.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{department.code || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{parentDept?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">{department.description || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        department.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {department.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="sticky right-0 bg-white px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => onEdit(department)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => onDelete(department._id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Department Form Modal Component
function DepartmentFormModal({ department, departments, onClose, onSave }: {
  department: Department | null;
  departments: Department[];
  onClose: () => void;
  onSave: (data: Partial<Department>) => void;
}) {
  const [formData, setFormData] = useState<Partial<Department>>({
    name: department?.name || '',
    code: department?.code || '',
    description: department?.description || '',
    parentDepartment: department?.parentDepartment || '',
    isActive: department?.isActive ?? true,
    notes: department?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = { ...formData };
    if (!dataToSave.parentDepartment) {
      delete (dataToSave as any).parentDepartment;
    }
    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-lg font-medium text-gray-900">
            {department ? 'Edit Department' : 'Add Department'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Department Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Department Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Parent Department
              </label>
              <select
                value={formData.parentDepartment || ''}
                onChange={(e) => setFormData({ ...formData, parentDepartment: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">None</option>
                {departments
                  .filter((d: Department) => d._id !== department?._id)
                  .map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {department ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Positions Tab Component
function PositionsTab({ positions, allPositions, departments, jobBands, jobGrades, isLoading, filter, setFilter, onAdd, onEdit, onDelete }: {
  positions: Position[];
  allPositions: Position[];
  departments: Department[];
  jobBands: JobBand[];
  jobGrades: JobGrade[];
  isLoading: boolean;
  filter: 'all' | 'active' | 'inactive';
  setFilter: (filter: 'all' | 'active' | 'inactive') => void;
  onAdd: () => void;
  onEdit: (position: Position) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Filter Tabs and Add Button */}
      <div className="flex justify-between items-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({allPositions.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'active' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Active ({allPositions.filter((p: Position) => p.isActive).length})
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'inactive' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Inactive ({allPositions.filter((p: Position) => !p.isActive).length})
          </button>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Position
        </button>
      </div>

      {/* Positions Table */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No positions</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new position.</p>
          <div className="mt-6">
            <button
              onClick={onAdd}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Position
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Band
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reports To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="sticky right-0 bg-gray-50 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {positions.map((position) => {
                const dept = departments.find(d => d._id === position.department);
                const band = jobBands.find(b => b._id === position.jobBand);
                const grade = jobGrades.find(g => g._id === position.jobGrade);
                const reportsTo = positions.find(p => p._id === position.reportsTo);

                return (
                  <tr key={position._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BriefcaseIcon className="h-5 w-5 text-indigo-600 mr-2" />
                        <div className="text-sm font-medium text-gray-900">{position.title}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{position.code || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{dept?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{band?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{grade?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{reportsTo?.title || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        position.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {position.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="sticky right-0 bg-white px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => onEdit(position)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => onDelete(position._id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Position Form Modal Component
function PositionFormModal({ position, departments, jobBands, jobGrades, positions, onClose, onSave }: {
  position: Position | null;
  departments: Department[];
  jobBands: JobBand[];
  jobGrades: JobGrade[];
  positions: Position[];
  onClose: () => void;
  onSave: (data: Partial<Position>) => void;
}) {
  const [formData, setFormData] = useState<Partial<Position>>({
    title: position?.title || '',
    code: position?.code || '',
    description: position?.description || '',
    department: position?.department || '',
    jobBand: position?.jobBand || '',
    jobGrade: position?.jobGrade || '',
    reportsTo: position?.reportsTo || '',
    isActive: position?.isActive ?? true,
    notes: position?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = { ...formData };
    if (!dataToSave.department) delete (dataToSave as any).department;
    if (!dataToSave.jobBand) delete (dataToSave as any).jobBand;
    if (!dataToSave.jobGrade) delete (dataToSave as any).jobGrade;
    if (!dataToSave.reportsTo) delete (dataToSave as any).reportsTo;
    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-lg font-medium text-gray-900">
            {position ? 'Edit Position' : 'Add Position'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Position Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Position Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <select
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Select Department</option>
                {departments.filter((d: Department) => d.isActive).map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Job Band
              </label>
              <select
                value={formData.jobBand || ''}
                onChange={(e) => setFormData({ ...formData, jobBand: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Select Job Band</option>
                {jobBands.filter(b => b.isActive).map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Job Grade
              </label>
              <select
                value={formData.jobGrade || ''}
                onChange={(e) => setFormData({ ...formData, jobGrade: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Select Job Grade</option>
                {jobGrades.filter(g => g.isActive).map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Reports To
              </label>
              <select
                value={formData.reportsTo || ''}
                onChange={(e) => setFormData({ ...formData, reportsTo: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">None</option>
                {positions
                  .filter((p: Position) => p._id !== position?._id && p.isActive)
                  .map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Job Description
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter job description, responsibilities, requirements, etc."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {position ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Job Structure Tab Component (Combined Job Bands & Grades)
function JobStructureTab({
  jobBands,
  allJobBands,
  jobGrades,
  allJobGrades,
  isLoadingBands,
  isLoadingGrades,
  bandFilter,
  gradeFilter,
  setBandFilter,
  setGradeFilter,
  onAddBand,
  onEditBand,
  onDeleteBand,
  onAddGrade,
  onEditGrade,
  onDeleteGrade
}: {
  jobBands: JobBand[];
  allJobBands: JobBand[];
  jobGrades: JobGrade[];
  allJobGrades: JobGrade[];
  isLoadingBands: boolean;
  isLoadingGrades: boolean;
  bandFilter: 'all' | 'active' | 'inactive';
  gradeFilter: 'all' | 'active' | 'inactive';
  setBandFilter: (filter: 'all' | 'active' | 'inactive') => void;
  setGradeFilter: (filter: 'all' | 'active' | 'inactive') => void;
  onAddBand: () => void;
  onEditBand: (jobBand: JobBand) => void;
  onDeleteBand: (id: string) => void;
  onAddGrade: () => void;
  onEditGrade: (jobGrade: JobGrade) => void;
  onDeleteGrade: (id: string) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Job Bands Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ChartBarIcon className="h-6 w-6 text-indigo-600" />
          Job Bands
        </h3>

        {/* Filter Tabs and Add Button */}
        <div className="flex justify-between items-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex">
            <button
              onClick={() => setBandFilter('all')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                bandFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All ({allJobBands.length})
            </button>
            <button
              onClick={() => setBandFilter('active')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                bandFilter === 'active' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Active ({allJobBands.filter(b => b.isActive).length})
            </button>
            <button
              onClick={() => setBandFilter('inactive')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                bandFilter === 'inactive' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Inactive ({allJobBands.filter(b => !b.isActive).length})
            </button>
          </div>
          <button
            onClick={onAddBand}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Job Band
          </button>
        </div>

        {/* Job Bands Table */}
        {isLoadingBands ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : jobBands.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No job bands</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new job band.</p>
            <div className="mt-6">
              <button
                onClick={onAddBand}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Job Band
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Band Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="sticky right-0 bg-gray-50 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobBands.map((jobBand) => (
                  <tr key={jobBand._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ChartBarIcon className="h-5 w-5 text-indigo-600 mr-2" />
                        <div className="text-sm font-medium text-gray-900">{jobBand.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{jobBand.code || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{jobBand.level}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">{jobBand.description || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        jobBand.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {jobBand.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="sticky right-0 bg-white px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => onEditBand(jobBand)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => onDeleteBand(jobBand._id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Job Grades Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AcademicCapIcon className="h-6 w-6 text-indigo-600" />
          Job Grades
        </h3>

        {/* Filter Tabs and Add Button */}
        <div className="flex justify-between items-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex">
            <button
              onClick={() => setGradeFilter('all')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                gradeFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All ({allJobGrades.length})
            </button>
            <button
              onClick={() => setGradeFilter('active')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                gradeFilter === 'active' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Active ({allJobGrades.filter(g => g.isActive).length})
            </button>
            <button
              onClick={() => setGradeFilter('inactive')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                gradeFilter === 'inactive' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Inactive ({allJobGrades.filter(g => !g.isActive).length})
            </button>
          </div>
          <button
            onClick={onAddGrade}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Job Grade
          </button>
        </div>

        {/* Job Grades Table */}
        {isLoadingGrades ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : jobGrades.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No job grades</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new job grade.</p>
            <div className="mt-6">
              <button
                onClick={onAddGrade}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Job Grade
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Band
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="sticky right-0 bg-gray-50 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobGrades.map((jobGrade) => {
                  const band = jobBands.find(b => b._id === jobGrade.jobBand);
                  return (
                    <tr key={jobGrade._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <AcademicCapIcon className="h-5 w-5 text-indigo-600 mr-2" />
                          <div className="text-sm font-medium text-gray-900">{jobGrade.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{jobGrade.code || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{band?.name || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{jobGrade.level}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          jobGrade.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {jobGrade.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="sticky right-0 bg-white px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => onEditGrade(jobGrade)}
                            className="text-indigo-600 hover:text-indigo-900 transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => onDeleteGrade(jobGrade._id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Job Band Form Modal Component
function JobBandFormModal({ jobBand, onClose, onSave }: {
  jobBand: JobBand | null;
  onClose: () => void;
  onSave: (data: Partial<JobBand>) => void;
}) {
  const [formData, setFormData] = useState<Partial<JobBand>>({
    name: jobBand?.name || '',
    code: jobBand?.code || '',
    description: jobBand?.description || '',
    level: jobBand?.level ?? 0,
    isActive: jobBand?.isActive ?? true,
    notes: jobBand?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-lg font-medium text-gray-900">
            {jobBand ? 'Edit Job Band' : 'Add Job Band'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Job Band Name * <span className="text-gray-500 text-xs">(e.g., Executive, Senior Manager, Director)</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Senior Manager"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., SM"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Level * <span className="text-gray-500 text-xs">(for hierarchy sorting)</span>
              </label>
              <input
                type="number"
                required
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., 1, 2, 3..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {jobBand ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Job Grades Tab Component
function JobGradesTab({ jobGrades, jobBands, isLoading, filter, setFilter, onAdd, onEdit, onDelete }: {
  jobGrades: JobGrade[];
  jobBands: JobBand[];
  isLoading: boolean;
  filter: 'all' | 'active' | 'inactive';
  setFilter: (filter: 'all' | 'active' | 'inactive') => void;
  onAdd: () => void;
  onEdit: (jobGrade: JobGrade) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Filter Tabs and Add Button */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'active'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'inactive'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Inactive
          </button>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Job Grade
        </button>
      </div>

      {/* Job Grades Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : jobGrades.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No job grades</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new job grade.</p>
          <div className="mt-6">
            <button
              onClick={onAdd}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Job Grade
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobGrades.map((jobGrade) => {
            const band = jobBands.find(b => b._id === jobGrade.jobBand);

            return (
              <div
                key={jobGrade._id}
                className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <AcademicCapIcon className="h-6 w-6 text-blue-600" />
                      <h3 className="ml-2 text-lg font-medium text-gray-900">{jobGrade.name}</h3>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        jobGrade.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {jobGrade.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {jobGrade.code && (
                    <p className="mt-2 text-sm text-gray-500">Code: {jobGrade.code}</p>
                  )}
                  {band && (
                    <p className="mt-1 text-sm text-gray-600">Band: {band.name}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-600">Level: {jobGrade.level}</p>
                  {jobGrade.salaryRange && (
                    <p className="mt-1 text-sm text-gray-600">
                      Salary: {jobGrade.salaryRange.currency} {jobGrade.salaryRange.min?.toLocaleString()} - {jobGrade.salaryRange.max?.toLocaleString()}
                    </p>
                  )}
                  {jobGrade.description && (
                    <p className="mt-2 text-sm text-gray-600">{jobGrade.description}</p>
                  )}
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      onClick={() => onEdit(jobGrade)}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      title="Edit job grade"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(jobGrade._id)}
                      className="inline-flex items-center p-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                      title="Delete job grade"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Job Grade Form Modal Component
function JobGradeFormModal({ jobGrade, jobBands, onClose, onSave }: {
  jobGrade: JobGrade | null;
  jobBands: JobBand[];
  onClose: () => void;
  onSave: (data: Partial<JobGrade>) => void;
}) {
  const [formData, setFormData] = useState<Partial<JobGrade>>({
    name: jobGrade?.name || '',
    code: jobGrade?.code || '',
    description: jobGrade?.description || '',
    jobBand: jobGrade?.jobBand || '',
    level: jobGrade?.level ?? 0,
    isActive: jobGrade?.isActive ?? true,
    notes: jobGrade?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = { ...formData };
    if (!dataToSave.jobBand) delete (dataToSave as any).jobBand;
    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-lg font-medium text-gray-900">
            {jobGrade ? 'Edit Job Grade' : 'Add Job Grade'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Job Grade Name * <span className="text-gray-500 text-xs">(e.g., M1, S1, E1)</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., M1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Job Band
              </label>
              <select
                value={formData.jobBand || ''}
                onChange={(e) => setFormData({ ...formData, jobBand: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Select Job Band</option>
                {jobBands.filter(b => b.isActive).map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Level * <span className="text-gray-500 text-xs">(for hierarchy sorting within band)</span>
              </label>
              <input
                type="number"
                required
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., 1, 2, 3..."
              />
            </div>



            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {jobGrade ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Groups Tab Component
function GroupsTab({ groups, allGroups, isLoading, filter, setFilter, onAdd, onEdit, onDelete }: {
  groups: WorkerGroup[];
  allGroups: WorkerGroup[];
  isLoading: boolean;
  filter: 'all' | 'active' | 'inactive';
  setFilter: (filter: 'all' | 'active' | 'inactive') => void;
  onAdd: () => void;
  onEdit: (group: WorkerGroup) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Filter Tabs and Add Button */}
      <div className="flex justify-between items-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({allGroups.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'active' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Active ({allGroups.filter(g => g.isActive).length})
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'inactive' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Inactive ({allGroups.filter(g => !g.isActive).length})
          </button>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Group
        </button>
      </div>

      {/* Groups Table */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No groups</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new group.</p>
          <div className="mt-6">
            <button
              onClick={onAdd}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Group
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="sticky right-0 bg-gray-50 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groups.map((group) => (
                <tr key={group._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserGroupIcon className="h-5 w-5 text-indigo-600 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{group.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{group.code || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">{group.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      group.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {group.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="sticky right-0 bg-white px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => onEdit(group)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onDelete(group._id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Group Form Modal Component
function GroupFormModal({ group, onClose, onSave }: {
  group: WorkerGroup | null;
  onClose: () => void;
  onSave: (data: Partial<WorkerGroup>) => void;
}) {
  const [formData, setFormData] = useState<Partial<WorkerGroup>>({
    name: group?.name || '',
    code: group?.code || '',
    description: group?.description || '',
    isActive: group?.isActive ?? true,
    notes: group?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-lg font-medium text-gray-900">
            {group ? 'Edit Group' : 'Add Group'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Group Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Team A, Night Shift, Site Workers"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., GRP-A"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Describe the purpose of this group"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {group ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Tasks Tab Component
function TasksTab({ tasks, allTasks, isLoading, filter, setFilter, onAdd, onEdit, onDelete }: {
  tasks: Task[];
  allTasks: Task[];
  isLoading: boolean;
  filter: 'all' | 'active' | 'inactive';
  setFilter: (filter: 'all' | 'active' | 'inactive') => void;
  onAdd: () => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Filter Tabs and Add Button */}
      <div className="flex justify-between items-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({allTasks.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'active' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Active ({allTasks.filter(t => t.isActive).length})
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'inactive' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Inactive ({allTasks.filter(t => !t.isActive).length})
          </button>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Task
        </button>
      </div>

      {/* Tasks Table */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new task.</p>
          <div className="mt-6">
            <button
              onClick={onAdd}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Task
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task ID
                </th>
                <th className="sticky right-0 bg-gray-50 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task) => (
                <tr key={task._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ClipboardDocumentListIcon className="h-5 w-5 text-indigo-600 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{task.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{task.taskId}</div>
                  </td>
                  <td className="sticky right-0 bg-white px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => onEdit(task)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onDelete(task._id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Task Form Modal Component
function TaskFormModal({ task, onClose, onSave }: {
  task: Task | null;
  onClose: () => void;
  onSave: (data: Partial<Task>) => void;
}) {
  const [formData, setFormData] = useState<Partial<Task>>({
    name: task?.name || '',
    taskId: task?.taskId || '',
    isActive: task?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-lg font-medium text-gray-900">
            {task ? 'Edit Task' : 'Add Task'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Task Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Task ID *
              </label>
              <input
                type="text"
                required
                value={formData.taskId}
                onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {task ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
