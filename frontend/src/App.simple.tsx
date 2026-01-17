function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Logogear Internal Portal</h1>
      <p>If you can see this, React is working!</p>
      <button 
        onClick={() => alert('Button clicked!')}
        style={{
          background: '#3b82f6',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Test Button
      </button>
    </div>
  )
}

export default App