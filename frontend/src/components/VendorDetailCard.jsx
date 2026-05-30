import React from 'react';

const VendorDetailCard = ({ vendor }) => {
  if (!vendor) return null;

  return (
    <div style={{
      padding: '20px',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.2)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      color: '#fff',
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{vendor.name}</h2>
      <p><strong>Category:</strong> {vendor.category}</p>
      {vendor.address && <p><strong>Address:</strong> {vendor.address}</p>}
      {vendor.priceRange?.min && vendor.priceRange?.max && (
        <p><strong>Price Range:</strong> {vendor.priceRange.min.toLocaleString('vi-VN')}đ - {vendor.priceRange.max.toLocaleString('vi-VN')}đ</p>
      )}
      {vendor.rating && <p><strong>Rating:</strong> {vendor.rating}/5</p>}
      {vendor.tips && <p><strong>Tips:</strong> {vendor.tips}</p>}
    </div>
  );
};

export default VendorDetailCard;