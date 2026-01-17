import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

export default function Applications() {
  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const response = await api.get('/api/applications')
      return response.data
    },
  })

  const handleLaunchApp = (app: any) => {
    if (app.url) {
      window.open(app.url, '_blank')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="mt-1 text-sm text-gray-600">
          Access all available internal applications
        </p>
      </div>

      {applications && applications.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {applications.map((app: any) => (
            <div key={app.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{app.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{app.description}</p>
                  
                  <div className="mt-3 flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      app.environment === 'production' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {app.environment}
                    </span>
                    {app.category && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {app.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={() => handleLaunchApp(app)}
                  disabled={!app.url}
                  className={`w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                    app.url
                      ? 'text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                      : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  }`}
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
                  {app.url ? 'Launch Application' : 'Coming Soon'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-500">No applications available</p>
        </div>
      )}
    </div>
  )
}