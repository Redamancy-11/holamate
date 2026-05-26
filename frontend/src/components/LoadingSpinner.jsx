import React from 'react';

const spinnerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  padding: '40px',
};

const dotContainerStyle = {
  display: 'flex',
  gap: '8px',
};

const LoadingSpinner = ({ message = 'Đang xử lý...' }) => {
  return (
    <div style={spinnerStyle}>
      <div style={dotContainerStyle}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e94560, #ff6b81)',
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <p style={{ color: '#a0a0b0', fontSize: '0.9rem' }}>{message}</p>
    </div>
  );
};

export default LoadingSpinner;
