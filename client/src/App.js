import React from 'react';

function App() {
    const VERSION = "v0.1.0-alpha";

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>ERP Metrics Dashboard</h1>
            <p>Status: Initializing Application Components</p>
            <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #ccc' }}>
                <strong>Current Version:</strong> {VERSION}
            </div>
        </div>
    );
}

export default App; // <-- THIS LINE MUST BE HERE