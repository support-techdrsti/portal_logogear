import { useState } from 'react'
import { api } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const { checkAuth } = useAuthStore()

  const handleSSOLogin = () => {
    window.location.href = '/auth/login'
  }

  const handleMockLogin = async () => {
    setIsLoading(true)
    try {
      const response = await api.post('/auth/mock-login')
      if (response.data.success) {
        // Store user data and redirect to dashboard
        await checkAuth()
        window.location.href = '/dashboard'
      }
    } catch (error) {
      console.error('Mock login failed:', error)
      alert('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Logogear Internal Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access internal applications
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <button
            onClick={handleSSOLogin}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in with SSO
          </button>
          
          {/* Development mock login - always show for now */}
          <button
            onClick={handleMockLogin}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : null}
            Development Login (Mock)
          </button>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Use your company credentials to sign in or use development login for testing
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}