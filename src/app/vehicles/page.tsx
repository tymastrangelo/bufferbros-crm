// src/app/vehicles/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { type Vehicle } from '@/lib/types'

type VehicleWithClient = Vehicle & {
  clients: { full_name: string } | null
}

export default function VehiclesPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<VehicleWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('created_at-desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [vehiclesPerPage, setVehiclesPerPage] = useState(10)
  const [totalVehicles, setTotalVehicles] = useState(0)

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const from = (currentPage - 1) * vehiclesPerPage
      const to = from + vehiclesPerPage - 1

      let data: VehicleWithClient[] | null = null;
      let error: Error | null = null;
      let count: number | null = 0;

      if (debouncedSearchTerm) {
        // When searching, we need two separate queries: one for data (RPC) and one for the count.
        const rpcQuery = supabase.rpc('search_vehicles', { search_term: debouncedSearchTerm })
          .select('*, clients!inner(full_name)')
          .order(sortBy.split('-')[0] === 'client_name' ? 'full_name' : sortBy.split('-')[0], { 
            referencedTable: sortBy.split('-')[0] === 'client_name' ? 'clients' : undefined,
            ascending: sortBy.split('-')[1] === 'asc', 
            nullsFirst: false 
          })
          .range(from, to);

        const countQuery = supabase.from('vehicles').select('id', { count: 'exact', head: true })
          .or(`make.ilike.%${debouncedSearchTerm}%,model.ilike.%${debouncedSearchTerm}%,clients.full_name.ilike.%${debouncedSearchTerm}%`, { referencedTable: 'clients' })

        const [dataRes, countRes] = await Promise.all([rpcQuery, countQuery]);
        data = dataRes.data as VehicleWithClient[];
        error = dataRes.error;
        count = countRes.count;
      } else {
        // Standard query when not searching, which returns data and count in one go.
        const { data: queryData, error: queryError, count: queryCount } = await supabase
          .from('vehicles')
          .select('*, clients!inner(full_name)', { count: 'exact' })
          .order(sortBy.split('-')[0] === 'client_name' ? 'full_name' : sortBy.split('-')[0], { referencedTable: sortBy.split('-')[0] === 'client_name' ? 'clients' : undefined, ascending: sortBy.split('-')[1] === 'asc', nullsFirst: false })
          .range(from, to);
        data = queryData;
        error = queryError;
        count = queryCount;
      }

      if (error) throw error

      setVehicles(data || [])
      setTotalVehicles(count || 0)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (err && typeof err === 'object' && 'message' in err) {
        setError(String(err.message));
      } else {
        setError('An unknown error occurred while fetching vehicles.')
      }
    } finally {
      setLoading(false)
    }
  }, [router, currentPage, vehiclesPerPage, debouncedSearchTerm, sortBy])

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, vehiclesPerPage, sortBy])

  if (loading) {
    return <div className="text-center p-6 text-gray-400">Loading vehicles...</div>
  }

  if (error) {
    return <div className="text-center p-6 text-red-500">Error: {error}</div>
  }

  const totalPages = Math.ceil(totalVehicles / vehiclesPerPage)

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Vehicles</h1>
        <Link
          href="/vehicles/new"
          className="px-4 py-2 font-semibold text-white bg-primary-700 rounded-lg shadow-sm hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Add Vehicle
        </Link>
      </div>

      {/* Filters and Controls */}
      <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by client, make, or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full rounded-lg border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="created_at-desc">Date Added (Newest)</option>
            <option value="created_at-asc">Date Added (Oldest)</option>
            <option value="make-asc">Make (A-Z)</option>
            <option value="make-desc">Make (Z-A)</option>
            <option value="client_name-asc">Client Name (A-Z)</option>
            <option value="client_name-desc">Client Name (Z-A)</option>
          </select>
          <select
            value={vehiclesPerPage}
            onChange={(e) => setVehiclesPerPage(Number(e.target.value))}
            className="w-full rounded-lg border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Plate</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicles.length > 0 ? (
                vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vehicle.year} {vehicle.make} {vehicle.model}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.clients?.full_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.license_plate || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/vehicles/${vehicle.id}`} className="text-primary-700 hover:text-primary-900 font-semibold">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                    {loading ? 'Fetching vehicles...' : 'No vehicles match your criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Showing <span className="font-semibold">{Math.min(1 + (currentPage - 1) * vehiclesPerPage, totalVehicles)}</span> to <span className="font-semibold">{Math.min(currentPage * vehiclesPerPage, totalVehicles)}</span> of <span className="font-semibold">{totalVehicles}</span> results
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Previous
            </button>
            <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}