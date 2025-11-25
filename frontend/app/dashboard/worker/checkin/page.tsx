'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import feathersClient from '@/lib/feathers';
import {
  QrCodeIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CameraIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Html5Qrcode } from 'html5-qrcode';

export default function WorkerCheckinPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [worker, setWorker] = useState<any>(null);
  const [todayTimesheet, setTodayTimesheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanError, setScanError] = useState('');
  const [cameraStarting, setCameraStarting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (showScanner) {
      setCameraStarting(true);
      setScanError('');

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      // Start camera automatically
      scanner.start(
        { facingMode: 'environment' }, // Use back camera on mobile
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // Prevent duplicate scans
          if (isProcessingRef.current) {
            console.log('Already processing, ignoring duplicate scan');
            return;
          }

          console.log('QR Code scanned:', decodedText);
          isProcessingRef.current = true;
          setScanning(true);

          // Stop scanner immediately to prevent multiple scans
          if (scannerRef.current) {
            // Check if scanner is actually running before trying to stop
            const state = scannerRef.current.getState();
            console.log('Scanner state:', state);

            if (state === 2) { // Html5QrcodeScannerState.SCANNING = 2
              scannerRef.current.stop().then(() => {
                console.log('Scanner stopped successfully');
                handleScan(decodedText);
              }).catch((err) => {
                console.error('Error stopping scanner:', err);
                // Still process even if stop fails
                handleScan(decodedText);
              });
            } else {
              console.log('Scanner not in scanning state, processing directly');
              handleScan(decodedText);
            }
          } else {
            handleScan(decodedText);
          }
        },
        (errorMessage) => {
          // Ignore scanning errors - they happen constantly while scanning
        }
      ).then(() => {
        setCameraStarting(false);
        setScanning(false);
        console.log('Camera started successfully');
      }).catch((err) => {
        console.error('Camera start error:', err);
        setCameraStarting(false);
        setScanning(false);
        setScanError('Failed to start camera. Please check camera permissions in your browser settings.');
      });

      return () => {
        const scanner = scannerRef.current;
        if (!scanner) return;

        try {
          const state = scanner.getState();
          console.log('Cleanup scanner state:', state);
          // 2 = SCANNING, 1 = PAUSED
          if (state === 2 || state === 1) {
            // Best-effort stop; ignore any errors because we're unmounting
            scanner.stop().catch(() => {});
          }
        } catch (err) {
          // Swallow all errors during cleanup to avoid noisy console/runtime errors
        } finally {
          scannerRef.current = null;
          isProcessingRef.current = false;
        }
      };
    }
  }, [showScanner]);

  const fetchData = async () => {
    try {
      const auth = await feathersClient.reAuthenticate();
      const currentUser = auth.user;
      setUser(currentUser);

      if (currentUser.role !== 'worker') {
        router.push('/dashboard');
        return;
      }

      if (currentUser.worker) {
        const workerData = await feathersClient.service('workers').get(currentUser.worker);
        setWorker(workerData);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const timesheets = await feathersClient.service('timesheets').find({
          query: {
            worker: currentUser.worker,
            'dailyEntries.date': {
              $gte: today.toISOString(),
              $lt: tomorrow.toISOString()
            },
            $limit: 1
          }
        });

        if (timesheets.data && timesheets.data.length > 0) {
          setTodayTimesheet(timesheets.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (qrData: string) => {
    if (qrData && !processing) {
      console.log('QR Code scanned:', qrData);
      setProcessing(true);
      setShowScanner(false);

      try {
        console.log('User company:', user.company);

        // Verify QR code belongs to the company
        // QR format: QR-{COMPANY_ID_FIRST_8_CHARS}-{TIMESTAMP}
        const companyPrefix = user.company.substring(0, 8).toUpperCase();
        if (!qrData.includes(companyPrefix)) {
          alert(`Invalid QR code. This QR code does not belong to your company.\n\nScanned: ${qrData}\nExpected prefix: QR-${companyPrefix}`);
          setProcessing(false);
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get day of week
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayOfWeek = dayNames[today.getDay()];

        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        let timesheet = todayTimesheet;

        if (!timesheet) {
          timesheet = await feathersClient.service('timesheets').create({
            worker: user.worker,
            company: user.company,
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            status: 'draft',
            dailyEntries: []
          });
        }

        const todayEntry = timesheet.dailyEntries?.find((entry: any) => {
          const entryDate = new Date(entry.date);
          return entryDate.toDateString() === today.toDateString();
        });

        const updatedEntries = timesheet.dailyEntries || [];
        const entryIndex = updatedEntries.findIndex((entry: any) => {
          const entryDate = new Date(entry.date);
          return entryDate.toDateString() === today.toDateString();
        });

        let message = '';

        // Determine action based on current status
        if (!todayEntry || !todayEntry.clockIn) {
          // Check In
          if (entryIndex >= 0) {
            updatedEntries[entryIndex] = {
              ...updatedEntries[entryIndex],
              date: today,
              dayOfWeek: dayOfWeek,
              clockIn: new Date(),
              checkInMethod: 'qr-code',
              qrCodeCheckIn: {
                qrCodeData: qrData,
                timestamp: new Date()
              },
              isAbsent: false
            };
          } else {
            updatedEntries.push({
              date: today,
              dayOfWeek: dayOfWeek,
              clockIn: new Date(),
              checkInMethod: 'qr-code',
              qrCodeCheckIn: {
                qrCodeData: qrData,
                timestamp: new Date()
              },
              isAbsent: false
            });
          }
          message = '✅ Checked In Successfully!';
        } else if (todayEntry.clockIn && !todayEntry.lunchOut) {
          // Lunch Out
          updatedEntries[entryIndex] = {
            ...updatedEntries[entryIndex],
            lunchOut: new Date()
          };
          message = '🍽️ Lunch Break Started!';
        } else if (todayEntry.lunchOut && !todayEntry.lunchIn) {
          // Lunch In
          updatedEntries[entryIndex] = {
            ...updatedEntries[entryIndex],
            lunchIn: new Date()
          };
          message = '✅ Back from Lunch!';
        } else if (todayEntry.clockIn && !todayEntry.clockOut) {
          // Check Out
          updatedEntries[entryIndex] = {
            ...updatedEntries[entryIndex],
            clockOut: new Date(),
            qrCodeCheckOut: {
              qrCodeData: qrData,
              timestamp: new Date()
            }
          };
          message = '👋 Checked Out Successfully!';
        } else {
          alert('You have already completed all actions for today.');
          setProcessing(false);
          return;
        }

        await feathersClient.service('timesheets').patch(timesheet._id, {
          dailyEntries: updatedEntries
        });

        // Show success message
        alert(message);

        // Refresh data
        await fetchData();
      } catch (error: any) {
        console.error('Error processing QR scan:', error);
        alert(error.message || 'Failed to process. Please try again.');
      } finally {
        setProcessing(false);
        setScanning(false);
        setShowScanner(false);
        isProcessingRef.current = false; // Reset processing flag
      }
    }
  };

  const handleError = (err: any) => {
    console.error('QR Scanner Error:', err);
    setScanError('Camera access denied or not available. Please enable camera permissions.');
  };

  const todayEntry = todayTimesheet?.dailyEntries?.find((entry: any) => {
    const entryDate = new Date(entry.date);
    const today = new Date();
    return entryDate.toDateString() === today.toDateString();
  });

  const isCheckedIn = todayEntry && todayEntry.clockIn && !todayEntry.clockOut;
  const isCheckedOut = todayEntry && todayEntry.clockOut;
  const isOnLunch = todayEntry && todayEntry.lunchOut && !todayEntry.lunchIn;

  const getNextAction = () => {
    if (!todayEntry || !todayEntry.clockIn) return 'Check In';
    if (todayEntry.clockIn && !todayEntry.lunchOut) return 'Lunch Out';
    if (todayEntry.lunchOut && !todayEntry.lunchIn) return 'Lunch In';
    if (todayEntry.lunchIn && !todayEntry.clockOut) return 'Check Out';
    return 'Completed';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/worker')}
          className="flex items-center text-indigo-600 hover:text-indigo-700 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <QrCodeIcon className="h-8 w-8 text-orange-600" />
          QR Check-In
        </h1>
        <p className="text-gray-600 mt-1">Scan QR code to check in/out</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Today's Status</h2>

        {isCheckedOut ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-20 w-20 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-green-600 mb-2">Checked Out</h3>
            <div className="space-y-2 text-gray-600">
              <p>Check-in: {new Date(todayEntry.clockIn).toLocaleTimeString()}</p>
              {todayEntry.lunchOut && (
                <p>Lunch Out: {new Date(todayEntry.lunchOut).toLocaleTimeString()}</p>
              )}
              {todayEntry.lunchIn && (
                <p>Lunch In: {new Date(todayEntry.lunchIn).toLocaleTimeString()}</p>
              )}
              <p>Check-out: {new Date(todayEntry.clockOut).toLocaleTimeString()}</p>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Total hours: {(() => {
                const totalMs = new Date(todayEntry.clockOut).getTime() - new Date(todayEntry.clockIn).getTime();
                let lunchMs = 0;
                if (todayEntry.lunchOut && todayEntry.lunchIn) {
                  lunchMs = new Date(todayEntry.lunchIn).getTime() - new Date(todayEntry.lunchOut).getTime();
                }
                return ((totalMs - lunchMs) / (1000 * 60 * 60)).toFixed(2);
              })()} hrs
            </p>
          </div>
        ) : isOnLunch ? (
          <div className="text-center py-8">
            <ClockIcon className="h-20 w-20 text-orange-600 mx-auto mb-4 animate-pulse" />
            <h3 className="text-2xl font-bold text-orange-600 mb-2">On Lunch Break</h3>
            <p className="text-gray-600 mb-2">
              Lunch started: {new Date(todayEntry.lunchOut).toLocaleTimeString()}
            </p>
            <p className="text-sm text-gray-500 mb-6">Scan QR code to return from lunch</p>
          </div>
        ) : isCheckedIn ? (
          <div className="text-center py-8">
            <ClockIcon className="h-20 w-20 text-blue-600 mx-auto mb-4 animate-pulse" />
            <h3 className="text-2xl font-bold text-blue-600 mb-2">Checked In</h3>
            <p className="text-gray-600 mb-2">
              Since: {new Date(todayEntry.clockIn).toLocaleTimeString()}
            </p>
            {todayEntry.lunchOut && todayEntry.lunchIn && (
              <p className="text-sm text-gray-500">
                Lunch: {new Date(todayEntry.lunchOut).toLocaleTimeString()} - {new Date(todayEntry.lunchIn).toLocaleTimeString()}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-4">Next: {getNextAction()}</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <XCircleIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-600 mb-2">Not Checked In</h3>
            <p className="text-gray-600 mb-6">Scan QR code to check in</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {isCheckedOut ? 'All Done for Today!' : `Next Action: ${getNextAction()}`}
        </h2>

        {!isCheckedOut && (
          <button
            onClick={() => setShowScanner(true)}
            disabled={processing}
            className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <CameraIcon className="h-8 w-8" />
            {processing ? 'Processing...' : `Scan QR to ${getNextAction()}`}
          </button>
        )}

        {isCheckedOut && (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">You have completed all check-ins for today.</p>
            <p className="text-sm text-gray-500">Come back tomorrow to check in again!</p>
          </div>
        )}

        {!isCheckedOut && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">How to use:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Click the "Scan QR" button above</li>
              <li>Allow camera access when prompted</li>
              <li>Point your camera at the company QR code</li>
              <li>The system will automatically record your action</li>
            </ol>
          </div>
        )}

        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">Daily Flow:</h4>
          <div className="space-y-2 text-sm text-green-800">
            <div className="flex items-center gap-2">
              <span className={todayEntry?.clockIn ? 'text-green-600' : 'text-gray-400'}>
                {todayEntry?.clockIn ? '✅' : '⭕'} 1. Check In
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={todayEntry?.lunchOut ? 'text-green-600' : 'text-gray-400'}>
                {todayEntry?.lunchOut ? '✅' : '⭕'} 2. Lunch Out
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={todayEntry?.lunchIn ? 'text-green-600' : 'text-gray-400'}>
                {todayEntry?.lunchIn ? '✅' : '⭕'} 3. Lunch In
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={todayEntry?.clockOut ? 'text-green-600' : 'text-gray-400'}>
                {todayEntry?.clockOut ? '✅' : '⭕'} 4. Check Out
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Scan QR Code</h2>
              <button
                onClick={() => {
                  setShowScanner(false);
                  setScanError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {scanError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 text-sm">{scanError}</p>
              </div>
            ) : null}

            <div className="relative">
              {cameraStarting ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                  <p className="text-gray-600">Starting camera...</p>
                </div>
              ) : null}

              {scanning || processing ? (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50 rounded-lg">
                  <div className="bg-white rounded-lg p-6 flex flex-col items-center shadow-xl">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-900 font-medium">
                      {scanning ? 'QR Code Detected! Processing...' : 'Processing...'}
                    </p>
                  </div>
                </div>
              ) : null}

              <div id="qr-reader" className="w-full"></div>

              {!cameraStarting && !scanError && !scanning && !processing ? (
                <p className="text-sm text-gray-600 text-center mt-4">
                  Point your camera at the company QR code
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
