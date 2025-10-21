'use client'

import { useState } from 'react'

// --- SETTINGS ---
const EMPLOYEE_SHARE = 0.40
const SUPPLIES_SHARE = 0.08
const COMPANY_SHARE = 0.52
const EMP_HOURLY_MIN = 50
const BASE_TIME: Record<number, number> = { 149: 1.5, 249: 3.0, 399: 5.0 }

// frequency profiles (price/time multipliers)
const FREQ_PROFILE: Record<string, { price: number; time: number }> = {
  weekly: { price: 0.40, time: 0.50 },
  biweekly: { price: 0.55, time: 0.65 },
  monthly: { price: 0.75, time: 0.85 },
  occasional: { price: 0.90, time: 1.00 }
}

interface CalculationResult {
  vehicle: string
  basePrice: number
  sizeMul: number
  condMul: number
  jobType: string
  freq: string
  priceMul: number
  timeMul: number
  addOns: number
  clientPrice: number
  estHours: number
  employeePay: number
  supplies: number
  companyProfit: number
  employeeHourly: number
  needsRaise: boolean
  suggestedPrice: number
}

export default function CalculatorPage() {
  const [vehicle, setVehicle] = useState('')
  const [packagePrice, setPackagePrice] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [size, setSize] = useState('1.0')
  const [condition, setCondition] = useState('1.0')
  const [jobType, setJobType] = useState('full')
  const [frequency, setFrequency] = useState('monthly')
  const [addOns, setAddOns] = useState<number[]>([])
  const [result, setResult] = useState<CalculationResult | null>(null)

  const handleAddOnChange = (value: number, checked: boolean) => {
    if (checked) {
      setAddOns([...addOns, value])
    } else {
      setAddOns(addOns.filter(v => v !== value))
    }
  }

  const num = (v: string | number, fb = 0): number => {
    const n = parseFloat(String(v))
    return isNaN(n) ? fb : n
  }

  const calculate = () => {
    const vehicleName = vehicle || 'Unnamed Vehicle'
    let basePrice = 0
    
    // Use custom price if selected, otherwise use package price
    if (packagePrice === 'custom') {
      basePrice = num(customPrice)
      if (!basePrice || basePrice <= 0) {
        alert('Please enter a valid custom price.')
        return
      }
    } else {
      basePrice = num(packagePrice)
      if (!basePrice) {
        alert('Please select a package or enter a custom price.')
        return
      }
    }
    
    const sizeMul = num(size, 1)
    const condMul = num(condition, 1)

    let freq = 'none'
    let priceMul = 1
    let timeMul = 1
    if (jobType === 'maintenance') {
      freq = frequency
      priceMul = FREQ_PROFILE[freq].price
      timeMul = FREQ_PROFILE[freq].time
    }

    // Add-ons
    const addOnsTotal = addOns.reduce((sum, val) => sum + val, 0)

    // Client price
    const clientPrice = Math.round((basePrice * sizeMul * condMul * priceMul) + addOnsTotal)

    // Estimated time
    const baseTime = BASE_TIME[basePrice] ?? 3.0
    const estHours = Math.max(0.5, Number((baseTime * sizeMul * condMul * timeMul).toFixed(1)))

    // Splits
    const employeePay = Math.round(clientPrice * EMPLOYEE_SHARE)
    const supplies = Math.round(clientPrice * SUPPLIES_SHARE)
    const companyProfit = clientPrice - employeePay - supplies

    // Hourly
    const employeeHourly = Math.round(employeePay / estHours)
    const needsRaise = employeeHourly < EMP_HOURLY_MIN
    const requiredClientHourly = EMP_HOURLY_MIN / EMPLOYEE_SHARE
    const suggestedPrice = Math.ceil(requiredClientHourly * estHours)

    setResult({
      vehicle: vehicleName,
      basePrice,
      sizeMul,
      condMul,
      jobType,
      freq,
      priceMul,
      timeMul,
      addOns: addOnsTotal,
      clientPrice,
      estHours,
      employeePay,
      supplies,
      companyProfit,
      employeeHourly,
      needsRaise,
      suggestedPrice
    })
  }

  const getHourlyColor = (hourly: number) => {
    if (hourly >= 70) return 'text-green-600'
    if (hourly >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
            🚘 Buffer Bros Smart Pricing Calculator
          </h1>

          {/* Vehicle + Package */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Vehicle Name</label>
              <input
                type="text"
                placeholder="Ex: Mercedes S560"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Package</label>
              <select
                value={packagePrice}
                onChange={(e) => setPackagePrice(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="149">The Base — $149</option>
                <option value="249">The Standard — $249</option>
                <option value="399">The Works — $399</option>
                <option value="custom">Custom Price</option>
              </select>
            </div>
          </div>

          {/* Custom Price Input */}
          {packagePrice === 'custom' && (
            <div className="mb-6">
              <label className="font-semibold text-gray-700 block mb-1">Custom Price ($)</label>
              <input
                type="number"
                placeholder="Enter custom price"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="1"
              />
              <p className="text-sm text-gray-600 mt-1">
                Enter a base price for custom jobs that don&apos;t fit standard packages.
              </p>
            </div>
          )}

          {/* Size + Condition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Vehicle Size</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="0.9">Coupe / Compact (×0.9)</option>
                <option value="1.0">Sedan / Midsize (×1.0)</option>
                <option value="1.2">SUV / Truck (×1.2)</option>
                <option value="1.4">XL / Oversize (×1.4)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="0.9">Excellent (×0.9)</option>
                <option value="1.0">Normal (×1.0)</option>
                <option value="1.2">Dirty / Heavy Use (×1.2)</option>
              </select>
            </div>
          </div>

          {/* Job Type + Frequency */}
          <div className="mb-6">
            <label className="font-semibold text-gray-700 block mb-2">Job Type</label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="full">Full Detail (One-Time)</option>
              <option value="maintenance">Maintenance Plan</option>
            </select>
          </div>

          {jobType === 'maintenance' && (
            <div className="mb-6">
              <label className="font-semibold text-gray-700 block mb-2">Maintenance Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="weekly">Weekly (×0.40)</option>
                <option value="biweekly">Biweekly (×0.55)</option>
                <option value="monthly">Monthly (×0.75)</option>
                <option value="occasional">Occasional (×0.90)</option>
              </select>
              <p className="text-sm text-gray-600 mt-1">
                Maintenance is faster and cheaper the more often it&apos;s done.
              </p>
            </div>
          )}

          {/* Add-ons */}
          <div className="mb-6">
            <label className="font-semibold text-gray-700 block mb-2">Add-Ons</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { label: 'Wax ($40)', value: 40 },
                { label: 'Engine Bay ($50)', value: 50 },
                { label: 'Ozone ($30)', value: 30 },
                { label: 'Headlight ($80)', value: 80 },
                { label: 'Pet Hair (Light $29)', value: 29 },
                { label: 'Pet Hair (Heavy $69)', value: 69 }
              ].map((addon) => (
                <label key={addon.value} className="flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    value={addon.value}
                    onChange={(e) => handleAddOnChange(addon.value, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {addon.label}
                </label>
              ))}
            </div>
          </div>

          {/* Calculate */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">Assumptions:</span> Employee 40%, Supplies 8%, Company 52%.
            </div>
            <button
              onClick={calculate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Calculate
            </button>
          </div>

          {/* Output */}
          {result && (
            <div className="mt-5 bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h2 className="text-xl font-bold mb-3 text-gray-800">{result.vehicle}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p><strong>Package:</strong> ${result.basePrice}</p>
                  <p><strong>Size:</strong> ×{result.sizeMul}</p>
                  <p><strong>Condition:</strong> ×{result.condMul}</p>
                  {result.jobType === 'maintenance' ? (
                    <p>
                      <strong>Frequency:</strong> {result.freq.charAt(0).toUpperCase() + result.freq.slice(1)} 
                      (Price×{result.priceMul}, Time×{result.timeMul})
                    </p>
                  ) : (
                    <p><strong>Job Type:</strong> Full Detail</p>
                  )}
                  <p><strong>Add-Ons:</strong> ${result.addOns}</p>
                </div>
                <div className="space-y-1">
                  <p><strong>Estimated Time:</strong> {result.estHours} hrs</p>
                  <p>
                    <strong>Client Price:</strong>{' '}
                    <span className="text-green-700 font-semibold">${result.clientPrice}</span>
                  </p>
                  <p><strong>Employee Pay (60%):</strong> ${result.employeePay}</p>
                  <p><strong>Supplies (8%):</strong> ${result.supplies}</p>
                  <p><strong>Company Profit (32%):</strong> ${result.companyProfit}</p>
                  <p>
                    <strong>Employee Hourly:</strong>{' '}
                    <span className={`${getHourlyColor(result.employeeHourly)} font-semibold`}>
                      ${result.employeeHourly}/hr
                    </span>
                  </p>
                </div>
              </div>

              {result.needsRaise ? (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-lg p-3">
                  <p className="font-semibold">
                    ⚠️ Suggestion: raise client price to{' '}
                    <span className="underline">${result.suggestedPrice}</span> to reach ~$
                    {EMP_HOURLY_MIN}/hr employee pay (at ~{result.estHours} hrs).
                  </p>
                </div>
              ) : (
                <div className="mt-4 bg-green-50 border border-green-200 text-green-900 rounded-lg p-3">
                  <p className="font-semibold">
                    ✅ Healthy job — meets or exceeds ${EMP_HOURLY_MIN}/hr target.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
