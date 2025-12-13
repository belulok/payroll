'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import feathersClient from '@/lib/feathers'
import {
  Cog6ToothIcon,
  ClockIcon,
  CalendarIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

interface TimesheetSettings {
  minuteIncrement: number
  roundingMethod: string
  minHoursPerDay: number
  maxHoursPerDay: number
  allowOvertime: boolean
  maxOTHoursPerDay: number
  sundayMultiplier: number
  phMultiplier: number
}

interface CustomHoliday {
  _id?: string
  name: string
  date: string
  type: string
  isPaid: boolean
  description: string
}

interface ClientData {
  _id: string
  name: string
  email: string
  contactPerson: string
  timesheetSettings: TimesheetSettings
  customHolidays: CustomHoliday[]
}

export default function ClientSettingsPage() {
  const router = useRouter()
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'timesheet' | 'holidays'>('timesheet')
  const [settings, setSettings] = useState<TimesheetSettings>({
    minuteIncrement: 30,
    roundingMethod: 'nearest',
    minHoursPerDay: 0,
    maxHoursPerDay: 24,
    allowOvertime: true,
    maxOTHoursPerDay: 4,
    sundayMultiplier: 1.5,
    phMultiplier: 2.0
  })
  const [holidays, setHolidays] = useState<CustomHoliday[]>([])
  const [newHoliday, setNewHoliday] = useState<CustomHoliday>({
    name: '',
    date: '',
    type: 'custom',
    isPaid: true,
    description: ''
  })
  const [showHolidayForm, setShowHolidayForm] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const auth = await feathersClient.reAuthenticate()
        if (auth.user.role !== 'client') {
          router.push('/dashboard')
          return
        }
        if (auth.user.client) {
          const client = await feathersClient.service('clients').get(auth.user.client)
          setClientData(client)
          if (client.timesheetSettings) {
            setSettings({ ...settings, ...client.timesheetSettings })
          }
          if (client.customHolidays) {
            setHolidays(client.customHolidays)
          }
        }
      } catch (err) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleSaveSettings = async () => {
    if (!clientData) return
    setSaving(true)
    try {
      await feathersClient.service('clients').patch(clientData._id, {
        timesheetSettings: settings
      })
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleAddHoliday = async () => {
    if (!clientData || !newHoliday.name || !newHoliday.date) return
    setSaving(true)
    try {
      const updatedHolidays = [...holidays, newHoliday]
      await feathersClient.service('clients').patch(clientData._id, {
        customHolidays: updatedHolidays
      })
      setHolidays(updatedHolidays)
      setNewHoliday({ name: '', date: '', type: 'custom', isPaid: true, description: '' })
      setShowHolidayForm(false)
      alert('Holiday added successfully!')
    } catch (error) {
      console.error('Error adding holiday:', error)
      alert('Failed to add holiday')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteHoliday = async (index: number) => {
    if (!clientData) return
    if (!confirm('Are you sure you want to delete this holiday?')) return
    
    setSaving(true)
    try {
      const updatedHolidays = holidays.filter((_, i) => i !== index)
      await feathersClient.service('clients').patch(clientData._id, {
        customHolidays: updatedHolidays
      })
      setHolidays(updatedHolidays)
    } catch (error) {
      console.error('Error deleting holiday:', error)
      alert('Failed to delete holiday')
    } finally {
      setSaving(false)
    }
  }

  // Calculate preview
  const calculatePreview = () => {
    const sampleMinutes = 490 // 8 hours 10 minutes
    const increment = settings.minuteIncrement
    let roundedMinutes

    switch (settings.roundingMethod) {
      case 'up':
        roundedMinutes = Math.ceil(sampleMinutes / increment) * increment
        break
      case 'down':
        roundedMinutes = Math.floor(sampleMinutes / increment) * increment
        break
      default:
        roundedMinutes = Math.round(sampleMinutes / increment) * increment
    }

    const hours = Math.floor(roundedMinutes / 60)
    const mins = roundedMinutes % 60
    return `${hours}h ${mins}m (${(roundedMinutes / 60).toFixed(2)} hrs)`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-xs md:text-base text-gray-600 mt-1">
          Configure timesheet settings and custom holidays
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('timesheet')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'timesheet'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClockIcon className="w-4 h-4 inline mr-2" />
          Timesheet Settings
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'holidays'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarIcon className="w-4 h-4 inline mr-2" />
          Custom Holidays
        </button>
      </div>

      {/* Timesheet Settings Tab */}
      {activeTab === 'timesheet' && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              💡 Configure how timesheet hours are recorded and calculated for workers assigned to your projects.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Time Increment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Increment</label>
              <select
                value={settings.minuteIncrement}
                onChange={(e) => setSettings({ ...settings, minuteIncrement: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value={1}>Every 1 minute (0.017 hr)</option>
                <option value={5}>Every 5 minutes (0.083 hr)</option>
                <option value={6}>Every 6 minutes (0.1 hr)</option>
                <option value={10}>Every 10 minutes (0.167 hr)</option>
                <option value={15}>Every 15 minutes (0.25 hr)</option>
                <option value={30}>Every 30 minutes (0.5 hr)</option>
                <option value={60}>Every 60 minutes (1 hr)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Minimum time unit for recording</p>
            </div>

            {/* Rounding Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rounding Method</label>
              <select
                value={settings.roundingMethod}
                onChange={(e) => setSettings({ ...settings, roundingMethod: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="nearest">Round to Nearest</option>
                <option value="up">Round Up</option>
                <option value="down">Round Down</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">How to round actual time</p>
            </div>

            {/* Max Hours/Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Normal Hours/Day</label>
              <input
                type="number"
                value={settings.maxHoursPerDay}
                onChange={(e) => setSettings({ ...settings, maxHoursPerDay: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                min={1}
                max={24}
              />
            </div>

            {/* Max OT Hours/Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max OT Hours/Day</label>
              <input
                type="number"
                value={settings.maxOTHoursPerDay}
                onChange={(e) => setSettings({ ...settings, maxOTHoursPerDay: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                min={0}
                max={12}
              />
            </div>

            {/* Sunday Multiplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sunday Rate Multiplier</label>
              <select
                value={settings.sundayMultiplier}
                onChange={(e) => setSettings({ ...settings, sundayMultiplier: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value={1}>1x (Normal)</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x (Double)</option>
                <option value={3}>3x (Triple)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Rate multiplier for Sunday work</p>
            </div>

            {/* PH Multiplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Public Holiday Rate Multiplier</label>
              <select
                value={settings.phMultiplier}
                onChange={(e) => setSettings({ ...settings, phMultiplier: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value={1}>1x (Normal)</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x (Double)</option>
                <option value={3}>3x (Triple)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Rate multiplier for PH work</p>
            </div>

            {/* Allow Overtime */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.allowOvertime}
                  onChange={(e) => setSettings({ ...settings, allowOvertime: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Allow Overtime Recording</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Preview</h4>
            <p className="text-sm text-gray-600">
              Example: If worker clocks 8 hours 10 minutes (490 min), it will be recorded as{' '}
              <strong className="text-indigo-600">{calculatePreview()}</strong>
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Custom Holidays Tab */}
      {activeTab === 'holidays' && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Custom Holidays</h3>
              <p className="text-xs text-gray-500">Add holidays specific to your organization</p>
            </div>
            <button
              onClick={() => setShowHolidayForm(true)}
              className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Add Holiday
            </button>
          </div>

          {/* Holiday Form */}
          {showHolidayForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name *</label>
                  <input
                    type="text"
                    value={newHoliday.name}
                    onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="e.g., Company Anniversary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={newHoliday.description}
                    onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newHoliday.isPaid}
                      onChange={(e) => setNewHoliday({ ...newHoliday, isPaid: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Paid Holiday</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setShowHolidayForm(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddHoliday}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                >
                  {saving ? 'Adding...' : 'Add Holiday'}
                </button>
              </div>
            </div>
          )}

          {/* Holidays List */}
          <div className="space-y-2">
            {holidays.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p>No custom holidays added yet</p>
              </div>
            ) : (
              holidays.map((holiday, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{holiday.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(holiday.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                      {holiday.isPaid && <span className="ml-2 text-green-600">• Paid</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteHoliday(idx)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

