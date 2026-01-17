import { useState, useEffect } from 'react'

// Simple auth store without Zustand
let currentUser: any = null
let isLoading = true

function App() {
  const [user, setUser] = useState(currentUser)
  const [loading, setLoading] = useState(isLoading)
  const [currentPage, setCurrentPage] = useState('login')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:3000/auth/me', {
        credentials: 'include'
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        currentUser = userData
        setCurrentPage('dashboard')
      }
    } catch (error) {
      console.log('Not authenticated')
    } finally {
      setLoading(false)
      isLoading = false
    }
  }

  const handleMockLogin = async () => {
    try {
      const response = await fetch('http://localhost:3000/auth/mock-login', {
        method: 'POST',
        credentials: 'include'
      })
      if (response.ok) {
        await checkAuth()
      }
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3000/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      setUser(null)
      currentUser = null
      setCurrentPage('login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{ 
          maxWidth: '400px', 
          width: '100%', 
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            textAlign: 'center', 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '8px'
          }}>
            Logogear Internal Portal
          </h2>
          <p style={{ 
            textAlign: 'center', 
            color: '#6b7280',
            marginBottom: '32px'
          }}>
            Sign in to access internal applications
          </p>
          
          <button
            onClick={() => window.location.href = 'http://localhost:3000/auth/login'}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              marginBottom: '12px'
            }}
          >
            Sign in with SSO
          </button>
          
          <button
            onClick={handleMockLogin}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Development Login (Mock)
          </button>
          
          <p style={{ 
            textAlign: 'center', 
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '16px'
          }}>
            Use your company credentials to sign in or use development login for testing
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Navigation */}
      <nav style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e5e7eb',
        padding: '0 16px'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '64px'
        }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
            Logogear Portal
          </h1>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <button 
              onClick={() => setCurrentPage('dashboard')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: currentPage === 'dashboard' ? '#3b82f6' : '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setCurrentPage('applications')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: currentPage === 'applications' ? '#3b82f6' : '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Applications
            </button>
            <button 
              onClick={() => setCurrentPage('profile')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: currentPage === 'profile' ? '#3b82f6' : '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Profile
            </button>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>
              Welcome, {user.name || user.email}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'applications' && <Applications />}
        {currentPage === 'profile' && <Profile user={user} />}
      </main>
    </div>
  )
}

function Dashboard() {
  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
        Dashboard
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        Welcome to the Logogear Internal Portal
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '24px', 
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
            Quick Actions
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Access frequently used features
          </p>
          <button style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            View Applications
          </button>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '24px', 
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
            Recent Activity
          </h3>
          <p style={{ color: '#6b7280' }}>
            No recent activity to display
          </p>
        </div>
      </div>
    </div>
  )
}

function Applications() {
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/applications', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setApps(data)
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading applications...</div>
  }

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
        Applications
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        Access all available internal applications
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {apps.map((app) => (
          <div key={app.id} style={{ 
            backgroundColor: 'white', 
            padding: '24px', 
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
              {app.name}
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              {app.description}
            </p>
            <div style={{ marginBottom: '16px' }}>
              <span style={{
                padding: '4px 8px',
                backgroundColor: app.environment === 'PRODUCTION' ? '#dcfce7' : '#fef3c7',
                color: app.environment === 'PRODUCTION' ? '#166534' : '#92400e',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {app.environment}
              </span>
            </div>
            <button
              onClick={() => app.url && window.open(app.url, '_blank')}
              disabled={!app.url}
              style={{
                padding: '8px 16px',
                backgroundColor: app.url ? '#3b82f6' : '#e5e7eb',
                color: app.url ? 'white' : '#9ca3af',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: app.url ? 'pointer' : 'not-allowed'
              }}
            >
              {app.url ? 'Launch Application' : 'Coming Soon'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Profile({ user }: { user: any }) {
  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
        Profile
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        Manage your profile information and preferences
      </p>
      
      <div style={{ 
        backgroundColor: 'white', 
        padding: '24px', 
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '600px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
          User Information
        </h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
            Name
          </label>
          <p style={{ color: '#111827' }}>{user.name || 'Not provided'}</p>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
            Email
          </label>
          <p style={{ color: '#111827' }}>{user.email}</p>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
            Department
          </label>
          <p style={{ color: '#111827' }}>{user.department || 'Not specified'}</p>
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
            Roles
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {user.roles && user.roles.length > 0 ? (
              user.roles.map((role: string) => (
                <span
                  key={role}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  {role}
                </span>
              ))
            ) : (
              <p style={{ color: '#6b7280' }}>No roles assigned</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App