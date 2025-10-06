'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { type Expense } from '@/lib/types'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0], // Default to today
    category: '',
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      setError(`Failed to fetch expenses: ${error.message}`)
    } else {
      setExpenses(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewExpense(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newExpense.description || !newExpense.amount || !newExpense.date) {
      setError('Please fill out all required fields.')
      return
    }
    setSubmitting(true)
    setError(null)

    const { error: insertError } = await supabase.from('expenses').insert({
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      date: newExpense.date,
      category: newExpense.category || null,
    })

    if (insertError) {
      setError(`Failed to add expense: ${insertError.message}`)
    } else {
      // Reset form and refetch expenses
      setNewExpense({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
      })
      await fetchExpenses()
    }
    setSubmitting(false)
  }

  const handleDelete = async (expenseId: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (deleteError) {
        setError(`Failed to delete expense: ${deleteError.message}`)
      } else {
        // Refetch expenses to update the list
        await fetchExpenses()
      }
    }
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Expenses</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Add Expense Form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Expense</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <input type="text" name="description" id="description" value={newExpense.description} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount ($)</label>
                <input type="number" name="amount" id="amount" value={newExpense.amount} onChange={handleInputChange} required step="0.01" className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                <input type="date" name="date" id="date" value={newExpense.date} onChange={handleInputChange} required className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                <input type="text" name="category" id="category" value={newExpense.category} onChange={handleInputChange} placeholder="e.g., Marketing, Supplies" className="mt-1 block w-full rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={submitting} className="w-full px-6 py-2 text-sm font-bold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:bg-primary-400">
                {submitting ? 'Adding...' : 'Add Expense'}
              </button>
            </form>
          </div>
        </div>

        {/* Expenses List */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">Expense History</h3>
            </div>
            <div className="border-t border-gray-200">
              {loading ? (
                <p className="text-center text-gray-500 p-6">Loading expenses...</p>
              ) : expenses.length === 0 ? (
                <p className="text-center text-gray-500 p-6">No expenses recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {expenses.map((expense) => (
                        <tr key={expense.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {/* Add 'T00:00:00' to treat the date as local, preventing timezone shifts */}
                            {new Date(expense.date + 'T00:00:00').toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{expense.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.category || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">${expense.amount.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onClick={() => handleDelete(expense.id)} className="text-red-600 hover:text-red-900">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}