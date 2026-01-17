import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { RectangleStackIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const response = await api.get('/api/applications')
      return response.data
    },
  })

  const quickActions = [
    {
      name: 'View Applications',
      description: 'Browse all available internal applications',
      href: '/applications',
      icon: RectangleStackIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'User Profile',
      description: 'Manage your profile and preferences',
      href: '/profile',
      icon: UserGroupIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Documentation',
      description: 'Access help and documentation',
      href: '#',
      icon: DocumentTextIcon,
      color: 'bg-purple-500',
    },
  ]

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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome to the Logogear Internal Portal
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => (
          <div key={action.name} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-lg ${action.color}`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  <a href={action.href} className="hover:text-blue-600">
                    {action.name}
                  </a>
                </h3>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Available Applications</h2>
        {applications && applications.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {applications.slice(0, 6).map((app: any) => (
              <div key={app.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <h3 className="font-medium text-gray-900">{app.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{app.description}</p>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    app.environment === 'production' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {app.environment}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No applications available</p>
        )}
      </div>
    </div>
  )
}