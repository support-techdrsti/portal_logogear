import { useState, useEffect } from 'react'

// Logogear Brand Colors (exact from logo screenshot - dark teal/navy blue theme)
const colors = {
  primary: '#1B4B5A', // Logogear signature dark teal/navy (from logo)
  secondary: '#2E6B7A', // Medium teal
  accent: '#4A9BAE', // Lighter teal/blue
  tertiary: '#7BC4D4', // Light blue accent
  dark: '#0F2A33', // Very dark teal
  light: '#F0F8FA', // Very light teal tint
  white: '#ffffff',
  red: '#E74C3C',
  orange: '#F39C12',
  green: '#27AE60',
  purple: '#8E44AD',
  indigo: '#6366F1',
  cyan: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#06B6D4',
    600: '#0891B2',
    700: '#0E7490',
    800: '#155E75',
    900: '#164E63'
  },
  gray: {
    50: '#F8FAFB',
    100: '#F1F5F7',
    200: '#E2E8EB',
    300: '#CBD5D9',
    400: '#9EAAB0',
    500: '#6B7B82',
    600: '#4A5B63',
    700: '#374147',
    800: '#1F2B30',
    900: '#0A1215'
  },
  teal: {
    50: '#F0F8FA',
    100: '#D6EDF2',
    200: '#B3DCE6',
    300: '#8BC8D6',
    400: '#5FB0C2',
    500: '#1B4B5A',
    600: '#164048',
    700: '#113538',
    800: '#0C2A28',
    900: '#071F1D'
  }
}

// Enhanced Logogear Logo Component with actual logo support
const LogoGearLogo = ({ size = 64, showText = true, useActualLogo = true }: { 
  size?: number, 
  showText?: boolean,
  useActualLogo?: boolean 
}) => {
  const [logoError, setLogoError] = useState(false)
  
  // Logogear logo URLs (multiple fallbacks)
  const logoUrls = [
    'https://logogear.co.in/wp-content/uploads/2023/05/logo-gear-logo.png',
    'https://logogear.co.in/wp-content/themes/logogear/assets/images/logo.png',
    'https://logogear.co.in/assets/logo.png'
  ]
  
  const [currentLogoIndex, setCurrentLogoIndex] = useState(0)
  
  const handleLogoError = () => {
    if (currentLogoIndex < logoUrls.length - 1) {
      setCurrentLogoIndex(currentLogoIndex + 1)
    } else {
      setLogoError(true)
    }
  }
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: showText ? '16px' : '0'
    }}>
      {/* Logo Container */}
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: `${size * 0.15}px`,
        overflow: 'hidden'
      }}>
        {useActualLogo && !logoError ? (
          <>
            {/* Actual Logogear Logo */}
            <img
              src={logoUrls[currentLogoIndex]}
              alt="Logogear Logo"
              onError={handleLogoError}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 8px rgba(27, 75, 90, 0.3))'
              }}
            />
            {/* Subtle background for logo */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(135deg, ${colors.white} 0%, ${colors.gray[50]} 100%)`,
              zIndex: -1,
              borderRadius: `${size * 0.15}px`,
              boxShadow: `0 ${size * 0.08}px ${size * 0.2}px rgba(27, 75, 90, 0.15)`
            }} />
          </>
        ) : (
          <>
            {/* Fallback Styled Logo */}
            <div style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.accent} 100%)`,
              borderRadius: `${size * 0.15}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: `${size * 0.35}px`,
              fontWeight: '800',
              color: colors.white,
              boxShadow: `0 ${size * 0.08}px ${size * 0.2}px rgba(27, 75, 90, 0.4)`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Logo shine effect */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                animation: 'logoShine 4s ease-in-out infinite'
              }}></div>
              
              {/* Stylized LG text */}
              <div style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                lineHeight: '0.7',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                <span style={{ 
                  fontSize: `${size * 0.28}px`, 
                  fontWeight: '900',
                  letterSpacing: '-1px'
                }}>LG</span>
                <div style={{
                  width: `${size * 0.4}px`,
                  height: '2px',
                  background: colors.white,
                  marginTop: '2px'
                }} />
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Company Text */}
      {showText && (
        <div>
          <div style={{
            fontSize: `${size * 0.45}px`,
            fontWeight: '800',
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: '1.1',
            letterSpacing: '-0.5px'
          }}>
            LogoGear
          </div>
          <div style={{
            fontSize: `${size * 0.18}px`,
            color: colors.gray[600],
            fontWeight: '600',
            marginTop: '2px',
            letterSpacing: '0.5px'
          }}>
            Solutions LLP
          </div>
        </div>
      )}
    </div>
  )
}

// Simple auth store
let currentUser: any = null
let isLoading = true

function App() {
  const [user, setUser] = useState(currentUser)
  const [loading, setLoading] = useState(isLoading)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [showAddTileModal, setShowAddTileModal] = useState(false)
  const [showShippingModal, setShowShippingModal] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/auth/me', {
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
      const response = await fetch('/auth/mock-login', {
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
      await fetch('/auth/logout', {
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

  const isAdmin = user?.roles?.includes('ADMIN')

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.accent} 100%)`,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background elements */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '200px',
          height: '200px',
          background: `radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)`,
          borderRadius: '50%',
          animation: 'float 6s ease-in-out infinite'
        }}></div>
        <div style={{
          position: 'absolute',
          top: '60%',
          right: '15%',
          width: '150px',
          height: '150px',
          background: `radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)`,
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite reverse'
        }}></div>
        
        <div style={{ 
          textAlign: 'center',
          color: colors.white,
          position: 'relative',
          zIndex: 1
        }}>
          <LogoGearLogo size={120} showText={false} useActualLogo={true} />
          <div style={{
            width: '80px',
            height: '80px',
            border: `4px solid ${colors.white}`,
            borderTop: `4px solid transparent`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '32px auto'
          }}></div>
          <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Loading Logogear Portal</div>
          <div style={{ fontSize: '16px', opacity: 0.9 }}>Corporate Merchandise Solutions</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={handleMockLogin} />
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: colors.light, 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' 
    }}>
      <Navigation 
        user={user} 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        onLogout={handleLogout}
        isAdmin={isAdmin}
      />

      <main style={{ paddingTop: '80px' }}>
        {currentPage === 'dashboard' && (
          <Dashboard 
            user={user} 
            isAdmin={isAdmin}
            onShowAddTile={() => setShowAddTileModal(true)}
            onShowShippingModal={() => setShowShippingModal(true)}
          />
        )}
        {currentPage === 'applications' && <Applications />}
        {currentPage === 'profile' && <Profile user={user} />}
        {currentPage === 'admin' && isAdmin && <AdminPanel />}
      </main>

      {showAddTileModal && isAdmin && (
        <AddTileModal onClose={() => setShowAddTileModal(false)} />
      )}

      {showShippingModal && (
        <ShippingToolsModal onClose={() => setShowShippingModal(false)} />
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .tile-hover {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .tile-hover::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.5s;
        }
        
        .tile-hover:hover::before {
          left: 100%;
        }
        
        @keyframes logoShine {
          0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(0deg); }
          50% { transform: translateX(100%) translateY(100%) rotate(180deg); }
        }
        
        .tile-hover:hover {
          transform: translateY(-12px) scale(1.02);
          box-shadow: 0 25px 50px -12px rgba(27, 75, 90, 0.25);
        }
        
        .gradient-bg {
          background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.accent} 100%);
        }
        
        .btn-primary {
          background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(27, 75, 90, 0.4);
          position: relative;
          overflow: hidden;
        }
        
        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }
        
        .btn-primary:hover::before {
          left: 100%;
        }
        
        .btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(27, 75, 90, 0.6);
        }
        
        .btn-secondary {
          background: ${colors.white};
          color: ${colors.primary};
          border: 2px solid ${colors.primary};
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .btn-secondary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: ${colors.primary};
          transition: left 0.3s ease;
          z-index: -1;
        }
        
        .btn-secondary:hover::before {
          left: 0;
        }
        
        .btn-secondary:hover {
          color: ${colors.white};
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(27, 75, 90, 0.4);
        }
        
        .glass-effect {
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(27, 75, 90, 0.2);
        }
        
        .card-shadow {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        
        .card-shadow-lg {
          box-shadow: 0 20px 25px -5px rgba(0, 188, 212, 0.1), 0 10px 10px -5px rgba(0, 188, 212, 0.04);
        }
        
        .animate-in {
          animation: slideInUp 0.6s ease-out;
        }
      `}</style>
    </div>
  )
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.accent} 100%)`,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Creative Background Elements */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '120%',
        height: '120%',
        background: `radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                     radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                     radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)`,
        animation: 'float 20s ease-in-out infinite'
      }}></div>
      
      {/* Floating geometric shapes */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '10%',
        width: '100px',
        height: '100px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        animation: 'float 8s ease-in-out infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        top: '70%',
        right: '15%',
        width: '80px',
        height: '80px',
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        transform: 'rotate(45deg)',
        animation: 'float 10s ease-in-out infinite reverse'
      }}></div>
      <div style={{
        position: 'absolute',
        top: '40%',
        right: '5%',
        width: '60px',
        height: '60px',
        background: 'rgba(255, 255, 255, 0.06)',
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        animation: 'float 12s ease-in-out infinite'
      }}></div>
      
      <div style={{ 
        maxWidth: '520px', 
        width: '100%', 
        padding: '56px',
        backgroundColor: colors.white,
        borderRadius: '32px',
        boxShadow: '0 32px 64px -12px rgba(27, 75, 90, 0.4)',
        margin: '24px',
        position: 'relative',
        zIndex: 1,
        border: `1px solid rgba(27, 75, 90, 0.1)`
      }} className="animate-in">
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          {/* Enhanced Logo with actual Logogear logo */}
          <div style={{ 
            marginBottom: '40px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{
              padding: '20px',
              background: `linear-gradient(135deg, ${colors.white} 0%, ${colors.gray[50]} 100%)`,
              borderRadius: '24px',
              boxShadow: '0 20px 40px rgba(27, 75, 90, 0.15)',
              border: `1px solid ${colors.gray[200]}`
            }}>
              <LogoGearLogo size={140} showText={false} useActualLogo={true} />
            </div>
          </div>
          
          <h1 style={{ 
            fontSize: '40px', 
            fontWeight: '800',
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '16px',
            lineHeight: '1.2'
          }}>
            Welcome to Logogear
          </h1>
          <p style={{ 
            color: colors.gray[600],
            fontSize: '20px',
            lineHeight: '1.6',
            marginBottom: '12px',
            fontWeight: '600'
          }}>
            Internal Portal
          </p>
          <p style={{ 
            color: colors.gray[500],
            fontSize: '16px',
            lineHeight: '1.5'
          }}>
            Corporate Merchandise Solutions & Business Operations
          </p>
        </div>
        
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={onLogin}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '20px 32px',
              color: colors.white,
              border: 'none',
              borderRadius: '16px',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              position: 'relative',
              zIndex: 1
            }}
          >
            <span style={{ fontSize: '24px' }}>🔐</span>
            Sign in with Company SSO
          </button>
          
          <button
            onClick={onLogin}
            className="btn-secondary"
            style={{
              width: '100%',
              padding: '20px 32px',
              backgroundColor: colors.white,
              color: colors.primary,
              border: `3px solid ${colors.primary}`,
              borderRadius: '16px',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              position: 'relative',
              zIndex: 1
            }}
          >
            <span style={{ fontSize: '24px' }}>🚀</span>
            Development Login (Demo)
          </button>
        </div>
        
        <div style={{
          padding: '32px',
          background: `linear-gradient(135deg, ${colors.cyan[50]} 0%, ${colors.teal[50]} 100%)`,
          borderRadius: '20px',
          border: `2px solid ${colors.cyan[100]}`
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '700',
            color: colors.gray[900],
            marginBottom: '16px',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>🏢</span>
            Access Internal Tools:
          </h4>
          <ul style={{
            fontSize: '14px',
            color: colors.gray[700],
            lineHeight: '1.8',
            margin: '16px 0 0 0',
            paddingLeft: '20px'
          }}>
            <li><strong>Merchandise Management</strong> - Product catalog & inventory</li>
            <li><strong>Shipping Tools</strong> - BlueDart & DC generation</li>
            <li><strong>Client Portals</strong> - Business operations dashboard</li>
            <li><strong>Analytics & Reports</strong> - Performance insights</li>
          </ul>
        </div>
        
        <p style={{ 
          textAlign: 'center', 
          fontSize: '13px',
          color: colors.gray[400],
          marginTop: '40px',
          lineHeight: '1.5'
        }}>
          © 2026 Logogear Solutions LLP. All rights reserved.
        </p>
      </div>
    </div>
  )
}

function Navigation({ user, currentPage, setCurrentPage, onLogout, isAdmin }: any) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'applications', label: 'Applications', icon: '📱' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: '⚙️' }] : [])
  ]

  return (
    <nav style={{ 
      backgroundColor: colors.white, 
      borderBottom: `1px solid ${colors.teal[100]}`,
      boxShadow: '0 4px 6px -1px rgba(27, 75, 90, 0.1)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      backdropFilter: 'blur(12px)',
      background: 'rgba(255, 255, 255, 0.95)'
    }}>
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 32px',
        height: '80px'
      }}>
        {/* Enhanced Logo Section with actual Logogear logo */}
        <LogoGearLogo size={56} showText={true} useActualLogo={true} />
        
        {/* Enhanced Navigation Items */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{ 
                padding: '14px 24px',
                background: currentPage === item.id 
                  ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)` 
                  : 'transparent',
                color: currentPage === item.id ? colors.white : colors.gray[700],
                border: currentPage === item.id ? 'none' : `2px solid transparent`,
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '700',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: currentPage === item.id ? '0 6px 20px rgba(27, 75, 90, 0.4)' : 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.backgroundColor = colors.cyan[50]
                  e.currentTarget.style.color = colors.primary
                  e.currentTarget.style.borderColor = colors.cyan[200]
                }
              }}
              onMouseOut={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = colors.gray[700]
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Enhanced User Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              color: colors.gray[900] 
            }}>
              {user.name || user.email}
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: colors.gray[500],
              fontWeight: '600'
            }}>
              {user.department || 'Employee'}
            </div>
          </div>
          
          {/* Enhanced User Avatar */}
          <div style={{
            width: '56px',
            height: '56px',
            background: `linear-gradient(135deg, ${colors.cyan[100]} 0%, ${colors.teal[100]} 100%)`,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: '700',
            color: colors.primary,
            border: `3px solid ${colors.cyan[200]}`,
            boxShadow: '0 4px 12px rgba(0, 188, 212, 0.2)'
          }}>
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
          
          <button
            onClick={onLogout}
            style={{
              padding: '14px 24px',
              backgroundColor: colors.gray[100],
              color: colors.gray[700],
              border: 'none',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = colors.red
              e.currentTarget.style.color = colors.white
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(244, 67, 54, 0.4)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = colors.gray[100]
              e.currentTarget.style.color = colors.gray[700]
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <span style={{ fontSize: '18px' }}>🚪</span>
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

function Dashboard({ user, isAdmin, onShowAddTile, onShowShippingModal }: any) {
  // Corporate Merchandise Business Tiles
  const businessTiles = [
    {
      id: 'zoho',
      title: 'Zoho CRM',
      description: 'Customer relationship management and sales tracking',
      icon: '📊',
      color: colors.primary,
      category: 'Sales & CRM',
      url: 'https://crm.zoho.com',
      features: ['Lead Management', 'Sales Pipeline', 'Customer Data']
    },
    {
      id: 'pim',
      title: 'Product Information Management',
      description: 'Manage product catalogs, specifications, and inventory',
      icon: '📦',
      color: colors.accent,
      category: 'Product Management',
      url: 'https://pim.logogear.co.in',
      features: ['Product Catalog', 'Inventory', 'Specifications']
    },
    {
      id: 'salesforce',
      title: 'Journey to Salesforce',
      description: 'Advanced CRM and customer journey management',
      icon: '🚀',
      color: colors.secondary,
      category: 'Sales & CRM',
      url: 'https://salesforce.com',
      features: ['Customer Journey', 'Advanced Analytics', 'Automation']
    },
    {
      id: 'redemption',
      title: 'Redemption Portal',
      description: 'Employee rewards and corporate gift redemption system',
      icon: '🎁',
      color: colors.purple,
      category: 'Employee Benefits',
      url: '#',
      features: ['Gift Redemption', 'Reward Points', 'Employee Benefits']
    },
    {
      id: 'merchandise',
      title: 'Merchandise Catalog',
      description: 'Browse and order corporate merchandise and promotional items',
      icon: '👕',
      color: colors.indigo,
      category: 'Merchandise',
      url: '#',
      features: ['Product Catalog', 'Custom Branding', 'Bulk Orders']
    },
    {
      id: 'vendor',
      title: 'Vendor Management',
      description: 'Manage suppliers, vendors, and procurement processes',
      icon: '🤝',
      color: colors.red,
      category: 'Operations',
      url: '#',
      features: ['Vendor Database', 'Procurement', 'Quality Control']
    },
    {
      id: 'analytics',
      title: 'Business Analytics',
      description: 'Sales reports, performance metrics, and business insights',
      icon: '📈',
      color: colors.accent,
      category: 'Analytics',
      url: '#',
      features: ['Sales Reports', 'Performance Metrics', 'Business Intelligence']
    },
    {
      id: 'shipping-tools',
      title: 'Logogear Shipping Tools',
      description: 'Process BlueDart files and generate Delivery Challans automatically',
      icon: '🚚',
      color: colors.red,
      category: 'Operations',
      url: '#shipping-tools',
      features: ['BlueDart Processing', 'DC Generation', 'Bulk Processing'],
      isShippingTool: true
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      description: 'Track stock levels, manage warehouses, and optimize inventory',
      icon: '📋',
      color: colors.primary,
      category: 'Operations',
      url: '#',
      features: ['Stock Tracking', 'Warehouse Management', 'Reorder Alerts']
    },
  ]

  const quickStats = [
    { label: 'Active Products', value: '2,847', icon: '📦', color: colors.primary },
    { label: 'Monthly Orders', value: '1,234', icon: '🛒', color: colors.secondary },
    { label: 'Happy Clients', value: '456', icon: '😊', color: colors.accent },
    { label: 'Revenue (₹)', value: '12.5L', icon: '💰', color: colors.purple }
  ]

  return (
    <div>
      {/* Welcome Header */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        color: colors.white,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%'
        }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: 'bold', 
            marginBottom: '8px',
            margin: 0
          }}>
            Welcome back, {user.name?.split(' ')[0] || 'User'}! 👋
          </h1>
          <p style={{ 
            fontSize: '18px', 
            opacity: 0.9,
            margin: 0
          }}>
            Ready to manage your corporate merchandise operations
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px',
        marginBottom: '32px'
      }}>
        {quickStats.map((stat) => (
          <div key={stat.label} style={{
            backgroundColor: colors.white,
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: `1px solid #f3f4f6`,
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: `${stat.color}20`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: colors.dark 
              }}>
                {stat.value}
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#6b7280' 
              }}>
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Section Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: colors.dark,
            margin: 0,
            marginBottom: '4px'
          }}>
            Business Applications
          </h2>
          <p style={{ 
            color: '#6b7280',
            margin: 0
          }}>
            Access your corporate merchandise management tools
          </p>
        </div>
        
        {isAdmin && (
          <button
            onClick={onShowAddTile}
            className="btn-primary"
            style={{
              padding: '12px 20px',
              color: colors.white,
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ➕ Add New Tile
          </button>
        )}
      </div>

      {/* Business Tiles Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '24px'
      }}>
        {businessTiles.map((tile) => (
          <div 
            key={tile.id} 
            className="tile-hover"
            style={{
              backgroundColor: colors.white,
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: `1px solid #f3f4f6`,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={() => {
              if (tile.isShippingTool) {
                onShowShippingModal();
              } else if (tile.url !== '#') {
                window.open(tile.url, '_blank')
              }
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              background: `linear-gradient(90deg, ${tile.color} 0%, ${tile.color}80 100%)`
            }}></div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                backgroundColor: `${tile.color}20`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0
              }}>
                {tile.icon}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: colors.dark,
                    margin: 0
                  }}>
                    {tile.title}
                  </h3>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: `${tile.color}20`,
                    color: tile.color,
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '500'
                  }}>
                    {tile.category}
                  </span>
                </div>
                <p style={{ 
                  color: '#6b7280', 
                  fontSize: '14px',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {tile.description}
                </p>
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '500', 
                color: colors.dark,
                marginBottom: '8px'
              }}>
                Key Features:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {tile.features.map((feature, index) => (
                  <span key={index} style={{
                    padding: '4px 8px',
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    {feature}
                  </span>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button style={{
                padding: '8px 16px',
                backgroundColor: (tile.url !== '#' || tile.isShippingTool) ? tile.color : '#e5e7eb',
                color: (tile.url !== '#' || tile.isShippingTool) ? colors.white : '#9ca3af',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: (tile.url !== '#' || tile.isShippingTool) ? 'pointer' : 'not-allowed'
              }}>
                {tile.isShippingTool ? '🚀 Open Tools' : tile.url !== '#' ? '🚀 Launch' : '🚧 Coming Soon'}
              </button>
              
              <div style={{ 
                fontSize: '12px', 
                color: '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>•</span>
                <span>Updated recently</span>
              </div>
            </div>
          </div>
        ))}
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
      const response = await fetch('/api/applications', {
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
    return (
      <div style={{ textAlign: 'center', padding: '64px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: `4px solid ${colors.primary}`,
          borderTop: '4px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
        <div>Loading applications...</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: colors.dark, 
          marginBottom: '8px' 
        }}>
          Applications Directory
        </h1>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Comprehensive list of all internal applications and systems
        </p>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '24px' 
      }}>
        {apps.map((app) => (
          <div key={app.id} className="tile-hover" style={{ 
            backgroundColor: colors.white, 
            padding: '24px', 
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: `1px solid #f3f4f6`
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: colors.dark, 
              marginBottom: '8px' 
            }}>
              {app.name}
            </h3>
            <p style={{ 
              color: '#6b7280', 
              marginBottom: '16px',
              lineHeight: '1.5'
            }}>
              {app.description}
            </p>
            <div style={{ marginBottom: '16px' }}>
              <span style={{
                padding: '4px 12px',
                backgroundColor: app.environment === 'PRODUCTION' ? '#dcfce7' : '#fef3c7',
                color: app.environment === 'PRODUCTION' ? '#166534' : '#92400e',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {app.environment}
              </span>
            </div>
            <button
              onClick={() => app.url && window.open(app.url, '_blank')}
              disabled={!app.url}
              className="btn-primary"
              style={{
                padding: '10px 20px',
                backgroundColor: app.url ? colors.primary : '#e5e7eb',
                color: app.url ? colors.white : '#9ca3af',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: app.url ? 'pointer' : 'not-allowed'
              }}
            >
              {app.url ? '🚀 Launch Application' : '🚧 Coming Soon'}
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
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: colors.dark, 
          marginBottom: '8px' 
        }}>
          User Profile
        </h1>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Manage your profile information and account settings
        </p>
      </div>
      
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px'
      }}>
        {/* Profile Information */}
        <div style={{ 
          backgroundColor: colors.white, 
          padding: '32px', 
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: `1px solid #f3f4f6`
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: colors.dark, 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            👤 Personal Information
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: colors.dark, 
                marginBottom: '6px' 
              }}>
                Full Name
              </label>
              <div style={{ 
                padding: '12px 16px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                color: colors.dark,
                fontSize: '16px'
              }}>
                {user.name || 'Not provided'}
              </div>
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: colors.dark, 
                marginBottom: '6px' 
              }}>
                Email Address
              </label>
              <div style={{ 
                padding: '12px 16px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                color: colors.dark,
                fontSize: '16px'
              }}>
                {user.email}
              </div>
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: colors.dark, 
                marginBottom: '6px' 
              }}>
                Department
              </label>
              <div style={{ 
                padding: '12px 16px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                color: colors.dark,
                fontSize: '16px'
              }}>
                {user.department || 'Not specified'}
              </div>
            </div>
          </div>
        </div>

        {/* Roles & Permissions */}
        <div style={{ 
          backgroundColor: colors.white, 
          padding: '32px', 
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: `1px solid #f3f4f6`
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: colors.dark, 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🔐 Roles & Access
          </h2>
          
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: colors.dark, 
              marginBottom: '12px' 
            }}>
              Assigned Roles
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {user.roles && user.roles.length > 0 ? (
                user.roles.map((role: string) => (
                  <span
                    key={role}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: role === 'ADMIN' ? `${colors.red}20` : `${colors.primary}20`,
                      color: role === 'ADMIN' ? colors.red : colors.primary,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {role === 'ADMIN' ? '⚙️' : '👤'} {role}
                  </span>
                ))
              ) : (
                <p style={{ color: '#6b7280' }}>No roles assigned</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminPanel() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: colors.dark, 
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          ⚙️ Admin Panel
        </h1>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Manage applications, users, and system settings
        </p>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '24px' 
      }}>
        <div style={{ 
          backgroundColor: colors.white, 
          padding: '24px', 
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: `1px solid #f3f4f6`
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.dark, marginBottom: '16px' }}>
            🏢 Application Management
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Add, edit, or remove applications from the portal
          </p>
          <button className="btn-primary" style={{
            padding: '10px 16px',
            backgroundColor: colors.primary,
            color: colors.white,
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}>
            Manage Apps
          </button>
        </div>

        <div style={{ 
          backgroundColor: colors.white, 
          padding: '24px', 
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: `1px solid #f3f4f6`
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.dark, marginBottom: '16px' }}>
            👥 User Management
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Manage user accounts, roles, and permissions
          </p>
          <button className="btn-primary" style={{
            padding: '10px 16px',
            backgroundColor: colors.secondary,
            color: colors.white,
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}>
            Manage Users
          </button>
        </div>

        <div style={{ 
          backgroundColor: colors.white, 
          padding: '24px', 
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: `1px solid #f3f4f6`
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.dark, marginBottom: '16px' }}>
            📊 System Analytics
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            View usage statistics and system performance
          </p>
          <button className="btn-primary" style={{
            padding: '10px 16px',
            backgroundColor: colors.accent,
            color: colors.white,
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}>
            View Analytics
          </button>
        </div>
      </div>
    </div>
  )
}

function AddTileModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    category: 'Operations',
    icon: '📱'
  })

  const categories = ['Operations', 'Sales & CRM', 'Product Management', 'Analytics', 'Employee Benefits', 'Merchandise']
  const icons = ['📱', '📊', '📦', '🚀', '🎁', '👕', '🤝', '📈', '📋', '💼', '🔧', '📞']

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: colors.white,
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: colors.dark,
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ➕ Add New Application Tile
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.dark,
              marginBottom: '6px'
            }}>
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="Enter application title"
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.dark,
              marginBottom: '6px'
            }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="Enter application description"
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.dark,
              marginBottom: '6px'
            }}>
              URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.dark,
              marginBottom: '6px'
            }}>
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.dark,
              marginBottom: '6px'
            }}>
              Icon
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {icons.map(icon => (
                <button
                  key={icon}
                  onClick={() => setFormData({...formData, icon})}
                  style={{
                    padding: '8px',
                    border: formData.icon === icon ? `2px solid ${colors.primary}` : '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: formData.icon === icon ? `${colors.primary}20` : colors.white,
                    fontSize: '20px',
                    cursor: 'pointer'
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '32px'
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 20px',
              backgroundColor: '#f3f4f6',
              color: colors.dark,
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Here you would typically save to database
              console.log('New tile:', formData)
              onClose()
            }}
            className="btn-primary"
            style={{
              flex: 1,
              padding: '12px 20px',
              backgroundColor: colors.primary,
              color: colors.white,
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Add Tile
          </button>
        </div>
      </div>
    </div>
  )
}

function ShippingToolsModal({ onClose }: { onClose: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingType, setProcessingType] = useState<'bluedart' | 'dc' | null>(null)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const allowedTypes = ['.xlsx', '.xls', '.csv']
      const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      
      if (allowedTypes.includes(fileExt)) {
        setSelectedFile(file)
        setError('')
        setStatus('')
      } else {
        setError('Please select an Excel (.xlsx, .xls) or CSV file')
        setSelectedFile(null)
      }
    }
  }

  const processFile = async (type: 'bluedart' | 'dc') => {
    if (!selectedFile) return

    setIsProcessing(true)
    setProcessingType(type)
    setError('')
    setStatus(`Processing ${type === 'bluedart' ? 'BlueDart' : 'DC'} file...`)

    try {
      const formData = new FormData()
      formData.append('dataFile', selectedFile)

      const endpoint = type === 'bluedart' 
        ? '/api/shipping-tools/bluedart' 
        : '/api/shipping-tools/dc'

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      if (response.ok) {
        // Handle file download
        let blob;
        if (type === 'bluedart') {
          // For CSV files, handle as text to prevent corruption
          const text = await response.text()
          blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
        } else {
          // For ZIP files, handle as binary
          blob = await response.blob()
        }
        
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        // Get filename from response headers or use default
        const contentDisposition = response.headers.get('content-disposition')
        let filename = type === 'bluedart' ? 'BlueDart_Processed.csv' : 'DC_Files.zip'
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/)
          if (filenameMatch) {
            filename = filenameMatch[1]
          }
        }
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        setStatus(`✅ ${type === 'bluedart' ? 'BlueDart file' : 'DC files'} generated successfully! Download started.`)
        
        // Reset after success
        setTimeout(() => {
          setSelectedFile(null)
          setStatus('')
          const fileInput = document.getElementById('shipping-file-input') as HTMLInputElement
          if (fileInput) fileInput.value = ''
        }, 3000)
        
      } else {
        const errorData = await response.json()
        if (response.status === 401) {
          throw new Error('Please login first to use shipping tools')
        }
        throw new Error(errorData.message || errorData.error || 'Processing failed')
      }
    } catch (error) {
      console.error('Processing error:', error)
      
      // Handle authentication errors specifically
      if (error instanceof Error && error.message.includes('401')) {
        setError('Please login first to use shipping tools')
      } else {
        setError(error instanceof Error ? error.message : 'Processing failed')
      }
      setStatus('')
    } finally {
      setIsProcessing(false)
      setProcessingType(null)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: colors.white,
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: colors.dark,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🚚 Logogear Shipping Tools
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        <p style={{
          color: '#6b7280',
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>
          Upload your order/BlueDart data file and generate processed files automatically. 
          No more Excel macros needed!
        </p>

        {/* File Upload Section */}
        <div style={{
          border: `2px dashed ${selectedFile ? colors.accent : '#d1d5db'}`,
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          marginBottom: '24px',
          backgroundColor: selectedFile ? `${colors.accent}10` : '#f9fafb'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>
              {selectedFile ? '📄' : '📁'}
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: '500',
              color: colors.dark,
              marginBottom: '4px'
            }}>
              {selectedFile ? selectedFile.name : 'Upload order / BlueDart data file'}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {selectedFile 
                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                : 'Supports .xlsx, .xls, and .csv files (max 10MB)'
              }
            </div>
          </div>
          
          <input
            id="shipping-file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <button
            onClick={() => document.getElementById('shipping-file-input')?.click()}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.primary,
              color: colors.white,
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {selectedFile ? 'Change File' : 'Select File'}
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => processFile('bluedart')}
            disabled={!selectedFile || isProcessing}
            style={{
              padding: '16px 20px',
              backgroundColor: selectedFile && !isProcessing ? colors.secondary : '#e5e7eb',
              color: selectedFile && !isProcessing ? colors.white : '#9ca3af',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: selectedFile && !isProcessing ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isProcessing && processingType === 'bluedart' ? 0.7 : 1
            }}
          >
            {isProcessing && processingType === 'bluedart' ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid currentColor',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Processing...
              </>
            ) : (
              <>
                📊 Generate BlueDart File
              </>
            )}
          </button>

          <button
            onClick={() => processFile('dc')}
            disabled={!selectedFile || isProcessing}
            style={{
              padding: '16px 20px',
              backgroundColor: selectedFile && !isProcessing ? colors.accent : '#e5e7eb',
              color: selectedFile && !isProcessing ? colors.white : '#9ca3af',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: selectedFile && !isProcessing ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isProcessing && processingType === 'dc' ? 0.7 : 1
            }}
          >
            {isProcessing && processingType === 'dc' ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid currentColor',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Processing...
              </>
            ) : (
              <>
                📋 Generate DC Files
              </>
            )}
          </button>
        </div>

        {/* Status Area */}
        {(status || error) && (
          <div style={{
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: error ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${error ? '#fecaca' : '#bbf7d0'}`,
            marginBottom: '16px'
          }}>
            <div style={{
              color: error ? '#dc2626' : '#16a34a',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {error ? '❌' : '✅'} {error || status}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.dark,
            marginBottom: '8px',
            margin: 0
          }}>
            📝 Instructions:
          </h4>
          <ul style={{
            fontSize: '13px',
            color: '#6b7280',
            lineHeight: '1.4',
            margin: '8px 0 0 0',
            paddingLeft: '16px'
          }}>
            <li><strong>BlueDart Processing:</strong> Cleans and reshapes your BlueDart/order data file</li>
            <li><strong>DC Generation:</strong> Creates individual Delivery Challan Excel files for each row</li>
            <li>Upload your data file first, then click the desired processing button</li>
            <li>Processed files will be automatically downloaded</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App