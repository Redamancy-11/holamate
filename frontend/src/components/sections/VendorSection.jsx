import React, { useEffect, useState } from 'react';
import { getVendors } from '../../services/api';

const VendorSection = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadVendors = async () => {
      try {
        const data = await getVendors();
        console.log('VendorSection - fetched:', data);
        setVendors(data.data || []);
      } catch (err) {
        console.error('VendorSection - error fetching:', err);
        setError('Không tải được dữ liệu vendor.');
      } finally {
        setLoading(false);
      }
    };
    loadVendors();
  }, []);

  return (
    <section id="vendors" className="section" style={{ padding: '80px 0', background: 'rgba(255,255,255,0.02)' }}>
      <div className="container">
        <div className="section-header reveal" style={{ marginBottom: 40 }}>
          <span className="badge badge-blue" style={{ marginBottom: 14, background: 'rgba(22,163,74,0.15)', color: '#10B981', borderColor: 'rgba(16,185,129,0.3)' }}>✦ Data API</span>
          <h2 style={{ color: '#fff' }}>Vendor API từ Backend</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 14 }}>Dữ liệu được lấy trực tiếp từ backend mới của HanoMate, hiển thị vendor và thẻ rủi ro.</p>
        </div>

        {loading ? (
          <div style={{ color: '#fff', opacity: 0.8 }}>Đang tải dữ liệu...</div>
        ) : error ? (
          <div style={{ color: '#FFB703', fontWeight: 600 }}>{error}</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
              {vendors.slice(0, 4).map((vendor) => (
                <div key={vendor.id || vendor.vietmapPlaceId || vendor.name} className="reveal" style={{ padding: 22, borderRadius: 24, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 18px 50px rgba(0,0,0,0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>{vendor.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.88rem' }}>{vendor.category}</div>
                    </div>
                    <span style={{ padding: '6px 12px', borderRadius: 9999, background: vendor.riskBadge === 'high' ? 'rgba(239,68,68,0.17)' : vendor.riskBadge === 'medium' ? 'rgba(249,115,22,0.16)' : 'rgba(16,185,129,0.16)', color: vendor.riskBadge === 'high' ? '#F87171' : vendor.riskBadge === 'medium' ? '#FB923C' : '#34D399', fontWeight: 700, fontSize: '.75rem', textTransform: 'uppercase' }}>{vendor.riskBadge || 'unknown'}</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '.9rem', marginBottom: 14, minHeight: 58 }}>{vendor.address || 'Không có địa chỉ'}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '.85rem' }}>
                      <div style={{ fontSize: '.76rem', textTransform: 'uppercase', marginBottom: 4 }}>Giá thấp nhất</div>
                      <div>{vendor.priceRange?.min ? vendor.priceRange.min.toLocaleString('vi-VN') + 'đ' : 'N/A'}</div>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '.85rem' }}>
                      <div style={{ fontSize: '.76rem', textTransform: 'uppercase', marginBottom: 4 }}>Giá cao nhất</div>
                      <div>{vendor.priceRange?.max ? vendor.priceRange.max.toLocaleString('vi-VN') + 'đ' : 'N/A'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {vendors.length > 4 && (
              <div style={{ textAlign: 'center', marginTop: 40 }} className="reveal">
                <a href="/order" className="btn btn-ghost" style={{ border: '1px solid rgba(242,112,36,0.4)', color: '#FF9800', background: 'rgba(242,112,36,0.05)' }}>
                  Xem Tất Cả {vendors.length} Cửa Hàng →
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default VendorSection;
