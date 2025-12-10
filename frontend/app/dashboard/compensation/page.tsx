'use client';

import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import {
  useCompensationConfig,
  useCreateCompensationConfig,
  useUpdateCompensationConfig,
  BenefitConfig,
  DeductionConfig,
  ClientRateConfig
} from '@/hooks/useCompensationConfig';
import { useJobBands } from '@/hooks/useJobBands';
import { useWorkerGroups } from '@/hooks/useWorkerGroups';
import { useClients } from '@/hooks/useClients';
import { usePositions } from '@/hooks/usePositions';
import {
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

type TabType = 'benefits' | 'deductions' | 'charges';
type ConfigMode = 'group' | 'band';

export default function CompensationPage() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?._id;

  const [activeTab, setActiveTab] = useState<TabType>('benefits');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const { data: config, isLoading: configLoading } = useCompensationConfig(companyId);
  const { data: jobBands = [], isLoading: jobBandsLoading } = useJobBands(companyId);
  const { data: workerGroups = [], isLoading: groupsLoading } = useWorkerGroups({ isActive: true });
  const { data: clients = [], isLoading: clientsLoading } = useClients(companyId);
  const { data: positions = [], isLoading: positionsLoading } = usePositions({ isActive: true });

  const createConfig = useCreateCompensationConfig(companyId);
  const updateConfig = useUpdateCompensationConfig(companyId);

  const [benefitConfigs, setBenefitConfigs] = useState<BenefitConfig[]>([]);
  const [deductionConfigs, setDeductionConfigs] = useState<DeductionConfig[]>([]);
  const [clientRateConfigs, setClientRateConfigs] = useState<ClientRateConfig[]>([]);

  // Initialize data from config
  useEffect(() => {
    if (config) {
      setBenefitConfigs(config.benefitConfigs || []);
      setDeductionConfigs(config.deductionConfigs || []);
      setClientRateConfigs(config.clientRateConfigs || []);
    }
  }, [config]);

  const handleSave = async () => {
    if (!companyId) return;

    setIsSaving(true);
    try {
      const data = {
        benefitConfigs,
        deductionConfigs,
        clientRateConfigs
      };

      if (config?._id) {
        await updateConfig.mutateAsync({ id: config._id, data });
      } else {
        await createConfig.mutateAsync({ ...data, company: companyId });
      }

      setSuccessMessage('Configuration saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  if (configLoading || jobBandsLoading || groupsLoading || clientsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Benefits, Compensation & Charges</h1>
        <p className="text-gray-600 mt-1">
          Configure benefits, deductions, and client billing rates by job band and position
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center">
          <CheckIcon className="h-5 w-5 mr-2" />
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('benefits')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'benefits'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Benefits
          </button>
          <button
            onClick={() => setActiveTab('deductions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'deductions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Deductions
          </button>
          <button
            onClick={() => setActiveTab('charges')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'charges'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Client Billing Rates
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'benefits' && (
          <BenefitsTab
            jobBands={jobBands}
            workerGroups={workerGroups}
            benefitConfigs={benefitConfigs}
            setBenefitConfigs={setBenefitConfigs}
          />
        )}
        {activeTab === 'deductions' && (
          <DeductionsTab
            jobBands={jobBands}
            workerGroups={workerGroups}
            deductionConfigs={deductionConfigs}
            setDeductionConfigs={setDeductionConfigs}
          />
        )}
        {activeTab === 'charges' && (
          <ChargesTab
            clients={clients}
            positions={positions}
            clientRateConfigs={clientRateConfigs}
            setClientRateConfigs={setClientRateConfigs}
          />
        )}
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

// Benefits Tab Component
function BenefitsTab({
  jobBands,
  workerGroups,
  benefitConfigs,
  setBenefitConfigs
}: {
  jobBands: any[];
  workerGroups: any[];
  benefitConfigs: BenefitConfig[];
  setBenefitConfigs: (configs: BenefitConfig[]) => void;
}) {
  const addConfig = () => {
    setBenefitConfigs([
      ...benefitConfigs,
      {
        configType: 'group', // Default to group
        annualLeave: 14,
        sickLeave: 14,
        benefits: []
      }
    ]);
  };

  const removeConfig = (index: number) => {
    setBenefitConfigs(benefitConfigs.filter((_, i) => i !== index));
  };

  const updateBenefitConfig = (index: number, field: string, value: any) => {
    const updated = [...benefitConfigs];
    // When switching config type, clear the previous selection
    if (field === 'configType') {
      if (value === 'group') {
        updated[index] = { ...updated[index], configType: 'group', group: undefined, groupName: undefined };
      } else {
        updated[index] = { ...updated[index], configType: 'band', jobBand: undefined, jobBandName: undefined };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setBenefitConfigs(updated);
  };

  const addBenefit = (configIndex: number) => {
    const updated = [...benefitConfigs];
    updated[configIndex].benefits.push({
      name: '',
      description: '',
      value: 0,
      type: 'fixed'
    });
    setBenefitConfigs(updated);
  };

  const removeBenefit = (configIndex: number, benefitIndex: number) => {
    const updated = [...benefitConfigs];
    updated[configIndex].benefits = updated[configIndex].benefits.filter((_, i) => i !== benefitIndex);
    setBenefitConfigs(updated);
  };

  const updateBenefit = (configIndex: number, benefitIndex: number, field: string, value: any) => {
    const updated = [...benefitConfigs];
    updated[configIndex].benefits[benefitIndex] = {
      ...updated[configIndex].benefits[benefitIndex],
      [field]: value
    };
    setBenefitConfigs(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Benefits Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">
            Group configurations take priority over Job Band configurations
          </p>
        </div>
        <button
          onClick={addConfig}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add
        </button>
      </div>

      {benefitConfigs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No benefit configurations yet. Click "Add" to get started.
        </div>
      ) : (
        benefitConfigs.map((config, configIndex) => {
          const isGroup = config.configType === 'group';

          return (
            <div key={configIndex} className={`border rounded-lg p-6 space-y-4 ${isGroup ? 'border-emerald-200 bg-emerald-50/30' : 'border-indigo-200 bg-indigo-50/30'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-4">
                  {/* Config Type Radio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Configuration Type
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`configType-benefit-${configIndex}`}
                          checked={config.configType === 'group'}
                          onChange={() => updateBenefitConfig(configIndex, 'configType', 'group')}
                          className="h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Group</span>
                        <span className="ml-1 text-xs text-gray-400">(Higher Priority)</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`configType-benefit-${configIndex}`}
                          checked={config.configType === 'band'}
                          onChange={() => updateBenefitConfig(configIndex, 'configType', 'band')}
                          className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Job Band</span>
                      </label>
                    </div>
                  </div>

                  {/* Dropdown based on selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isGroup ? 'Select Group *' : 'Select Job Band *'}
                    </label>
                    {isGroup ? (
                      <select
                        value={config.group || ''}
                        onChange={(e) => {
                          const selectedGroup = workerGroups.find(g => g._id === e.target.value);
                          updateBenefitConfig(configIndex, 'group', e.target.value);
                          updateBenefitConfig(configIndex, 'groupName', selectedGroup?.name);
                        }}
                        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Select Group --</option>
                        {workerGroups.map(group => (
                          <option key={group._id} value={group._id}>
                            {group.name} {group.code ? `(${group.code})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={config.jobBand || ''}
                        onChange={(e) => {
                          const selectedBand = jobBands.find(b => b._id === e.target.value);
                          updateBenefitConfig(configIndex, 'jobBand', e.target.value);
                          updateBenefitConfig(configIndex, 'jobBandName', selectedBand?.name);
                        }}
                        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Select Job Band --</option>
                        {jobBands.map(band => (
                          <option key={band._id} value={band._id}>
                            {band.name} {band.code ? `(${band.code})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeConfig(configIndex)}
                  className="text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Leave Entitlements */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Annual Leave (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.annualLeave}
                    onChange={(e) => updateBenefitConfig(configIndex, 'annualLeave', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sick Leave (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.sickLeave}
                    onChange={(e) => updateBenefitConfig(configIndex, 'sickLeave', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Additional Benefits */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Additional Benefits
                  </label>
                  <button
                    onClick={() => addBenefit(configIndex)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Benefit
                  </button>
                </div>

                {config.benefits.map((benefit, benefitIndex) => (
                  <div key={benefitIndex} className="grid grid-cols-12 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Benefit name"
                      value={benefit.name}
                      onChange={(e) => updateBenefit(configIndex, benefitIndex, 'name', e.target.value)}
                      className="col-span-4 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Value"
                      value={benefit.value}
                      onChange={(e) => updateBenefit(configIndex, benefitIndex, 'value', parseFloat(e.target.value) || 0)}
                      className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <select
                      value={benefit.type}
                      onChange={(e) => updateBenefit(configIndex, benefitIndex, 'type', e.target.value)}
                      className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="fixed">Fixed</option>
                      <option value="percentage">%</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Description"
                      value={benefit.description || ''}
                      onChange={(e) => updateBenefit(configIndex, benefitIndex, 'description', e.target.value)}
                      className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => removeBenefit(configIndex, benefitIndex)}
                      className="col-span-1 text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// Deductions Tab Component
function DeductionsTab({
  jobBands,
  workerGroups,
  deductionConfigs,
  setDeductionConfigs
}: {
  jobBands: any[];
  workerGroups: any[];
  deductionConfigs: DeductionConfig[];
  setDeductionConfigs: (configs: DeductionConfig[]) => void;
}) {
  const addConfig = () => {
    setDeductionConfigs([
      ...deductionConfigs,
      {
        configType: 'group', // Default to group
        epfEnabled: true,
        epfEmployeeRate: 11,
        epfEmployerRate: 12,
        socsoEnabled: true,
        socsoEmployeeRate: 0.5,
        socsoEmployerRate: 1.75,
        eisEnabled: true,
        eisEmployeeRate: 0.2,
        eisEmployerRate: 0.2,
        customDeductions: []
      }
    ]);
  };

  const removeConfig = (index: number) => {
    setDeductionConfigs(deductionConfigs.filter((_, i) => i !== index));
  };

  const updateDeductionConfig = (index: number, field: string, value: any) => {
    const updated = [...deductionConfigs];
    // When switching config type, clear the previous selection
    if (field === 'configType') {
      if (value === 'group') {
        updated[index] = { ...updated[index], configType: 'group', group: undefined, groupName: undefined };
      } else {
        updated[index] = { ...updated[index], configType: 'band', jobBand: undefined, jobBandName: undefined };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setDeductionConfigs(updated);
  };

  const addDeduction = (configIndex: number) => {
    const updated = [...deductionConfigs];
    updated[configIndex].customDeductions.push({
      name: '',
      description: '',
      amount: 0,
      type: 'fixed'
    });
    setDeductionConfigs(updated);
  };

  const removeDeduction = (configIndex: number, deductionIndex: number) => {
    const updated = [...deductionConfigs];
    updated[configIndex].customDeductions = updated[configIndex].customDeductions.filter((_, i) => i !== deductionIndex);
    setDeductionConfigs(updated);
  };

  const updateDeduction = (configIndex: number, deductionIndex: number, field: string, value: any) => {
    const updated = [...deductionConfigs];
    updated[configIndex].customDeductions[deductionIndex] = {
      ...updated[configIndex].customDeductions[deductionIndex],
      [field]: value
    };
    setDeductionConfigs(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Deduction Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">
            Group configurations take priority over Job Band configurations
          </p>
        </div>
        <button
          onClick={addConfig}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add
        </button>
      </div>

      {deductionConfigs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No deduction configurations yet. Click "Add" to get started.
        </div>
      ) : (
        deductionConfigs.map((config, configIndex) => {
          const isGroup = config.configType === 'group';

          return (
            <div key={configIndex} className={`border rounded-lg p-6 space-y-4 ${isGroup ? 'border-emerald-200 bg-emerald-50/30' : 'border-indigo-200 bg-indigo-50/30'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-4">
                  {/* Config Type Radio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Configuration Type
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`configType-deduction-${configIndex}`}
                          checked={config.configType === 'group'}
                          onChange={() => updateDeductionConfig(configIndex, 'configType', 'group')}
                          className="h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Group</span>
                        <span className="ml-1 text-xs text-gray-400">(Higher Priority)</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`configType-deduction-${configIndex}`}
                          checked={config.configType === 'band'}
                          onChange={() => updateDeductionConfig(configIndex, 'configType', 'band')}
                          className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Job Band</span>
                      </label>
                    </div>
                  </div>

                  {/* Dropdown based on selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isGroup ? 'Select Group *' : 'Select Job Band *'}
                    </label>
                    {isGroup ? (
                      <select
                        value={config.group || ''}
                        onChange={(e) => {
                          const selectedGroup = workerGroups.find(g => g._id === e.target.value);
                          updateDeductionConfig(configIndex, 'group', e.target.value);
                          updateDeductionConfig(configIndex, 'groupName', selectedGroup?.name);
                        }}
                        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Select Group --</option>
                        {workerGroups.map(group => (
                          <option key={group._id} value={group._id}>
                            {group.name} {group.code ? `(${group.code})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={config.jobBand || ''}
                        onChange={(e) => {
                          const selectedBand = jobBands.find(b => b._id === e.target.value);
                          updateDeductionConfig(configIndex, 'jobBand', e.target.value);
                          updateDeductionConfig(configIndex, 'jobBandName', selectedBand?.name);
                        }}
                        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Select Job Band --</option>
                        {jobBands.map(band => (
                          <option key={band._id} value={band._id}>
                            {band.name} {band.code ? `(${band.code})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeConfig(configIndex)}
                  className="text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Statutory Deductions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Statutory Deductions
                </label>
                <div className="space-y-4">
                  {/* EPF */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.epfEnabled}
                          onChange={(e) => updateDeductionConfig(configIndex, 'epfEnabled', e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 mr-2"
                        />
                        <span className="text-sm font-medium text-gray-900">EPF (Employees Provident Fund)</span>
                      </label>
                    </div>
                    {config.epfEnabled && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Employee Rate (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={config.epfEmployeeRate ?? 11}
                            onChange={(e) => updateDeductionConfig(configIndex, 'epfEmployeeRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Employer Rate (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={config.epfEmployerRate ?? 12}
                            onChange={(e) => updateDeductionConfig(configIndex, 'epfEmployerRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SOCSO */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.socsoEnabled}
                          onChange={(e) => updateDeductionConfig(configIndex, 'socsoEnabled', e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 mr-2"
                        />
                        <span className="text-sm font-medium text-gray-900">SOCSO (Social Security)</span>
                      </label>
                    </div>
                    {config.socsoEnabled && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Employee Rate (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={config.socsoEmployeeRate ?? 0.5}
                            onChange={(e) => updateDeductionConfig(configIndex, 'socsoEmployeeRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Employer Rate (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={config.socsoEmployerRate ?? 1.75}
                            onChange={(e) => updateDeductionConfig(configIndex, 'socsoEmployerRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* EIS */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.eisEnabled}
                          onChange={(e) => updateDeductionConfig(configIndex, 'eisEnabled', e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 mr-2"
                        />
                        <span className="text-sm font-medium text-gray-900">EIS (Employment Insurance System)</span>
                      </label>
                    </div>
                    {config.eisEnabled && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Employee Rate (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={config.eisEmployeeRate ?? 0.2}
                            onChange={(e) => updateDeductionConfig(configIndex, 'eisEmployeeRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Employer Rate (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={config.eisEmployerRate ?? 0.2}
                            onChange={(e) => updateDeductionConfig(configIndex, 'eisEmployerRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Custom Deductions */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Custom Deductions
                  </label>
                  <button
                    onClick={() => addDeduction(configIndex)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Deduction
                  </button>
                </div>

                {config.customDeductions.map((deduction, deductionIndex) => (
                  <div key={deductionIndex} className="grid grid-cols-12 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Deduction name"
                      value={deduction.name}
                      onChange={(e) => updateDeduction(configIndex, deductionIndex, 'name', e.target.value)}
                      className="col-span-4 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={deduction.amount}
                      onChange={(e) => updateDeduction(configIndex, deductionIndex, 'amount', parseFloat(e.target.value) || 0)}
                      className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <select
                      value={deduction.type}
                      onChange={(e) => updateDeduction(configIndex, deductionIndex, 'type', e.target.value)}
                      className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="fixed">Fixed</option>
                      <option value="percentage">%</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Description"
                      value={deduction.description || ''}
                      onChange={(e) => updateDeduction(configIndex, deductionIndex, 'description', e.target.value)}
                      className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => removeDeduction(configIndex, deductionIndex)}
                      className="col-span-1 text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// Charges Tab Component
function ChargesTab({
  clients,
  positions,
  clientRateConfigs,
  setClientRateConfigs
}: {
  clients: any[];
  positions: any[];
  clientRateConfigs: ClientRateConfig[];
  setClientRateConfigs: (configs: ClientRateConfig[]) => void;
}) {
  const addClient = () => {
    const unusedClients = clients.filter(
      client => !clientRateConfigs.find(config => config.client === client._id)
    );

    if (unusedClients.length === 0) {
      alert('All clients already have rate configurations');
      return;
    }

    const firstUnused = unusedClients[0];
    setClientRateConfigs([
      ...clientRateConfigs,
      {
        client: firstUnused._id,
        clientName: firstUnused.name,
        positionRates: []
      }
    ]);
  };

  const removeClient = (index: number) => {
    setClientRateConfigs(clientRateConfigs.filter((_, i) => i !== index));
  };

  const updateClientConfig = (index: number, field: string, value: any) => {
    const updated = [...clientRateConfigs];
    updated[index] = { ...updated[index], [field]: value };
    setClientRateConfigs(updated);
  };

  const addPosition = (configIndex: number) => {
    const updated = [...clientRateConfigs];
    updated[configIndex].positionRates.push({
      position: '',
      normalRate: 0,
      otRate: 0,
      sundayRate: 0,
      phRate: 0,
      currency: 'MYR'
    });
    setClientRateConfigs(updated);
  };

  const removePosition = (configIndex: number, positionIndex: number) => {
    const updated = [...clientRateConfigs];
    updated[configIndex].positionRates = updated[configIndex].positionRates.filter((_, i) => i !== positionIndex);
    setClientRateConfigs(updated);
  };

  const updatePosition = (configIndex: number, positionIndex: number, field: string, value: any) => {
    const updated = [...clientRateConfigs];
    updated[configIndex].positionRates[positionIndex] = {
      ...updated[configIndex].positionRates[positionIndex],
      [field]: value
    };
    setClientRateConfigs(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Client Billing Rates by Position</h2>
        <button
          onClick={addClient}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Client
        </button>
      </div>

      {clientRateConfigs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No client rate configurations yet. Click "Add Client" to get started.
        </div>
      ) : (
        clientRateConfigs.map((config, configIndex) => (
          <div key={configIndex} className="border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client *
                </label>
                <select
                  value={config.client}
                  onChange={(e) => {
                    const selectedClient = clients.find(c => c._id === e.target.value);
                    updateClientConfig(configIndex, 'client', e.target.value);
                    updateClientConfig(configIndex, 'clientName', selectedClient?.name);
                  }}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Client --</option>
                  {clients.map(client => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => removeClient(configIndex)}
                className="text-red-600 hover:text-red-800"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Position Rates */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Position Billing Rates
                </label>
                <button
                  onClick={() => addPosition(configIndex)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Position
                </button>
              </div>

              {config.positionRates.map((rate, rateIndex) => (
                <div key={rateIndex} className="border border-gray-100 rounded-lg p-4 mb-3 bg-gray-50">
                  <div className="grid grid-cols-6 gap-3 mb-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
                      <select
                        value={rate.position}
                        onChange={(e) => {
                          const selectedPosition = positions.find(p => p._id === e.target.value);
                          const updated = [...clientRateConfigs];
                          updated[configIndex].positionRates[rateIndex] = {
                            ...updated[configIndex].positionRates[rateIndex],
                            position: e.target.value,
                            positionTitle: selectedPosition?.title
                          };
                          setClientRateConfigs(updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">-- Select Position --</option>
                        {positions.map(pos => (
                          <option key={pos._id} value={pos._id}>
                            {pos.title} {pos.code ? `(${pos.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Normal Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={rate.normalRate}
                        onChange={(e) => updatePosition(configIndex, rateIndex, 'normalRate', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">OT Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={rate.otRate}
                        onChange={(e) => updatePosition(configIndex, rateIndex, 'otRate', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Sunday Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={rate.sundayRate}
                        onChange={(e) => updatePosition(configIndex, rateIndex, 'sundayRate', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">PH Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        value={rate.phRate}
                        onChange={(e) => updatePosition(configIndex, rateIndex, 'phRate', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="w-32">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                      <select
                        value={rate.currency}
                        onChange={(e) => updatePosition(configIndex, rateIndex, 'currency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="MYR">MYR</option>
                        <option value="USD">USD</option>
                        <option value="SGD">SGD</option>
                      </select>
                    </div>
                    <button
                      onClick={() => removePosition(configIndex, rateIndex)}
                      className="text-red-600 hover:text-red-800 text-sm flex items-center"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
