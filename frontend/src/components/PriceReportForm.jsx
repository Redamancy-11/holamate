import React, { useState } from 'react';
import { submitPriceReport } from '../services/api';

const formStyle = {
  background: 'rgba(26, 26, 46, 0.8)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(233, 69, 96, 0.15)',
  borderRadius: '16px',
  padding: '32px',
  maxWidth: '500px',
  margin: '0 auto',
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '10px',
  border: '1px solid rgba(233, 69, 96, 0.2)',
  background: '#16213e',
  color: '#eaeaea',
  fontSize: '0.95rem',
  fontFamily: 'Inter, sans-serif',
  marginBottom: '16px',
  outline: 'none',
  transition: 'border-color 0.3s ease',
};

const labelStyle = {
  display: 'block',
  marginBottom: '6px',
  color: '#a0a0b0',
  fontSize: '0.85rem',
  fontWeight: 500,
};

const PriceReportForm = () => {
  const [formData, setFormData] = useState({
    vendorId: '',
    itemName: '',
    price: '',
    notes: '',
  });
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const result = await submitPriceReport({
        ...formData,
        price: Number(formData.price),
      });
      setStatus('success');
      setFormData({ vendorId: '', itemName: '', price: '', notes: '' });
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <form style={formStyle} onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: '24px', fontSize: '1.2rem' }}>📝 Báo cáo giá</h3>

      <label style={labelStyle}>Vendor ID</label>
      <input
        style={inputStyle}
        name="vendorId"
        value={formData.vendorId}
        onChange={handleChange}
        placeholder="Nhập ID vendor..."
        required
      />

      <label style={labelStyle}>Tên sản phẩm / dịch vụ</label>
      <input
        style={inputStyle}
        name="itemName"
        value={formData.itemName}
        onChange={handleChange}
        placeholder="VD: Phở bò, Cà phê trứng..."
        required
      />

      <label style={labelStyle}>Giá (VND)</label>
      <input
        style={inputStyle}
        name="price"
        type="number"
        value={formData.price}
        onChange={handleChange}
        placeholder="VD: 35000"
        required
      />

      <label style={labelStyle}>Ghi chú</label>
      <textarea
        style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
        name="notes"
        value={formData.notes}
        onChange={handleChange}
        placeholder="Ghi chú thêm (tùy chọn)..."
      />

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', marginTop: '8px' }}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Đang gửi...' : 'Gửi báo cáo'}
      </button>

      {status === 'success' && (
        <p style={{ color: '#4ade80', marginTop: '12px', textAlign: 'center', fontSize: '0.9rem' }}>
          ✅ Gửi báo cáo thành công!
        </p>
      )}
      {status === 'error' && (
        <p style={{ color: '#f87171', marginTop: '12px', textAlign: 'center', fontSize: '0.9rem' }}>
          ❌ Có lỗi xảy ra. Vui lòng thử lại.
        </p>
      )}
    </form>
  );
};

export default PriceReportForm;
