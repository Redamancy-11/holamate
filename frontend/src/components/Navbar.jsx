import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const Navbar = () => {
  const location = useLocation();
  
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const { 
    user, 
    sellerUser, 
    setShowAuthModal, 
    logout, 
    logoutSeller,
    notifications,
    markAsRead,
    setNotificationClickedOrder
  } = useContext(AuthContext);
  
  const navigate = useNavigate();

  // Dynamic context based on route with session fallback
  const isSellerPage = location.pathname.startsWith('/seller');
  const currentUser = isSellerPage ? (sellerUser || user) : (user || sellerUser);
  const currentLogout = isSellerPage 
    ? (sellerUser ? logoutSeller : logout) 
    : (user ? logout : logoutSeller);

  // Filter notifications by target audience based on active profile type
  const isCurrentlySeller = currentUser === sellerUser;
  const visibleNotifications = notifications.filter(n => 
    isCurrentlySeller ? n.type === 'seller' : n.type === 'buyer'
  );
  const unreadCount = visibleNotifications.filter(n => !n.read).length;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { 
    setMenuOpen(false); 
    setShowNotifications(false);
  }, [location]);

  // Click outside to close notifications dropdown
  useEffect(() => {
    if (!showNotifications) return;
    const handleOutsideClick = () => setShowNotifications(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [showNotifications]);

  const isHome = location.pathname === '/';
  const textColor = scrolled ? '#374151' : isHome ? 'rgba(255,255,255,.88)' : '#374151';
  const logoColor = scrolled ? '#F27024' : isHome ? '#fff' : '#F27024';

  // Dynamic Navigation Links
  const navLinks = [
    { label: 'Tính Năng', href: '/#features' },
    { label: 'Cách Hoạt Động', href: '/#how-it-works' },
    { label: 'Bản Đồ 🗺️', href: '/map', isRoute: true }
  ];

  if (currentUser) {
    if (sellerUser) {
      navLinks.push({ label: 'Kênh Người Bán 🏪', href: '/seller', isRoute: true });
    } else if (user) {
      navLinks.push({ label: 'Đặt Đồ 🍔', href: '/order', isRoute: true });
    }
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? 'rgba(255,255,255,.96)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid #E5E7EB' : 'none',
      boxShadow: scrolled ? '0 2px 16px rgba(0,0,0,.06)' : 'none',
      transition: 'all .4s cubic-bezier(.4,0,.2,1)',
      padding: '0 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>

        {/* Back button (top-left) */}
        {location.pathname !== '/' && (
          <button
            aria-label="Quay lại"
            onClick={() => navigate(-1)}
            style={{
              position: 'absolute', left: 16, top: 16, width: 40, height: 40, zIndex: 1200,
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: scrolled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.06)',
              border: scrolled ? '1px solid #E5E7EB' : '1px solid rgba(255,255,255,0.12)',
              color: scrolled ? '#374151' : '#fff', cursor: 'pointer', transition: 'all .18s ease',
              boxShadow: scrolled ? '0 6px 18px rgba(15,23,42,0.06)' : 'none'
            }}
          >
            ←
          </button>
        )}

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: '1.25rem', color: logoColor, transition: 'color .3s ease', letterSpacing: '-0.02em', textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#F27024,#FF7A00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#fff', fontWeight: 900, flexShrink: 0, boxShadow: '0 4px 12px rgba(242,112,36,.35)' }}>O</div>
          HolaMate
        </Link>

        {/* Desktop Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="hide-mobile">
          {navLinks.map(l => l.isRoute ? (
            <Link key={l.label} to={l.href} style={{ padding: '8px 16px', borderRadius: 50, fontWeight: 500, fontSize: '.88rem', color: textColor, transition: 'all .25s ease', textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F27024'; e.currentTarget.style.background = 'rgba(242,112,36,.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = textColor; e.currentTarget.style.background = 'transparent'; }}>
              {l.label}
            </Link>
          ) : (
            <a key={l.label} href={l.href} style={{ padding: '8px 16px', borderRadius: 50, fontWeight: 500, fontSize: '.88rem', color: textColor, transition: 'all .25s ease', textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F27024'; e.currentTarget.style.background = 'rgba(242,112,36,.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = textColor; e.currentTarget.style.background = 'transparent'; }}>
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }} className="hide-mobile">
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              
              {/* Notification Bell */}
              <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.35rem',
                    padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: textColor, position: 'relative', transition: 'all 0.2s', outline: 'none'
                  }}
                  title="Thông báo"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: 2, right: 2, background: '#EF4444', color: '#fff',
                      fontSize: '0.68rem', fontWeight: 800, borderRadius: '50%', minWidth: 16, height: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                      border: `2px solid ${scrolled ? '#fff' : '#0B192C'}`
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div style={{
                    position: 'absolute', right: 0, top: 48, width: 340,
                    background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)', padding: '14px 0',
                    zIndex: 1010, animation: 'fadeInUp 0.2s ease-out'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>Thông báo</span>
                      {visibleNotifications.length > 0 && (
                        <button
                          onClick={() => {
                            visibleNotifications.forEach(n => markAsRead(n.id));
                          }}
                          style={{ background: 'none', border: 'none', color: '#F27024', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Đọc tất cả
                        </button>
                      )}
                    </div>
                    <div style={{ maxHeight: 300, overflowY: 'auto', padding: '4px 0' }}>
                      {visibleNotifications.length === 0 ? (
                        <div style={{ padding: '30px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                          Không có thông báo mới nào 🔔
                        </div>
                      ) : (
                        visibleNotifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markAsRead(n.id);
                              setNotificationClickedOrder(n.orderData || { _id: n.orderId });
                              setShowNotifications(false);
                              if (isSellerPage) {
                                navigate('/seller');
                              } else {
                                navigate('/order');
                              }
                            }}
                            style={{
                              padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                              cursor: 'pointer', background: n.read ? 'transparent' : 'rgba(242,112,36,0.08)',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(242,112,36,0.08)'}
                          >
                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', marginBottom: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{n.title}</span>
                              {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F27024' }} />}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{n.message}</div>
                            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                              {new Date(n.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: scrolled ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)', padding: '4px 12px 4px 4px', borderRadius: 50 }}>
                <img src={currentUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: textColor }}>{currentUser.name}</span>
              </div>
              
              <button onClick={currentLogout} style={{ padding: '8px 16px', borderRadius: 50, background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Đăng xuất</button>
            </div>
          ) : (
            <>
              <button onClick={() => setShowAuthModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 50, fontWeight: 500, fontSize: '.88rem', color: textColor, transition: 'color .25s ease' }}
                onMouseEnter={e => e.currentTarget.style.color = '#F27024'}
                onMouseLeave={e => e.currentTarget.style.color = textColor}>Đăng nhập</button>
              <button onClick={() => setShowAuthModal(true)} style={{ padding: '10px 22px', borderRadius: 50, background: '#F27024', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '.88rem', boxShadow: '0 4px 14px rgba(242,112,36,.32)', transition: 'all .25s ease', display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e05f15'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F27024'; e.currentTarget.style.transform = 'none'; }}>
                Bắt đầu ngay <span>→</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="show-mobile">
          {currentUser && (
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem',
                padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: scrolled ? '#374151' : '#fff', position: 'relative'
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: 0, background: '#EF4444', color: '#fff',
                  fontSize: '0.6rem', fontWeight: 800, borderRadius: '50%', minWidth: 14, height: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5 }} aria-label="Toggle menu">
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: 'block', width: 22, height: 2, background: scrolled ? '#F27024' : '#fff', borderRadius: 2, transition: 'all .3s ease', transform: menuOpen ? (i === 0 ? 'translateY(7px) rotate(45deg)' : i === 2 ? 'translateY(-7px) rotate(-45deg)' : 'scaleX(0)') : 'none' }} />
            ))}
          </button>
        </div>
      </div>

      {/* Mobile Notification Drawer/Overlay */}
      {showNotifications && (
        <div style={{
          position: 'fixed', top: 72, left: 16, right: 16, maxWeight: 'calc(100vh - 100px)',
          background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)', padding: '14px 0',
          zIndex: 1010, className: 'show-mobile'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>Thông báo</span>
            <button
              onClick={() => {
                visibleNotifications.forEach(n => markAsRead(n.id));
                setShowNotifications(false);
              }}
              style={{ background: 'none', border: 'none', color: '#F27024', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Đọc tất cả
            </button>
          </div>
          <div style={{ maxHeight: 250, overflowY: 'auto', padding: '4px 0' }}>
            {visibleNotifications.length === 0 ? (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                Không có thông báo mới nào 🔔
              </div>
            ) : (
              visibleNotifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id);
                    setNotificationClickedOrder(n.orderData || { _id: n.orderId });
                    setShowNotifications(false);
                    if (isSellerPage) {
                      navigate('/seller');
                    } else {
                      navigate('/order');
                    }
                  }}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer', background: n.read ? 'transparent' : 'rgba(242,112,36,0.08)'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', marginBottom: 3 }}>{n.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{n.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {menuOpen && (
        <div style={{ background: '#fff', padding: '16px 24px 24px', borderTop: '1px solid #E5E7EB', animation: 'slideInDown .25s ease' }}>
          {navLinks.map(l => l.isRoute ? (
            <Link key={l.label} to={l.href} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #F3F4F6', fontWeight: 500, color: '#374151', textDecoration: 'none' }}>{l.label}</Link>
          ) : (
            <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #F3F4F6', fontWeight: 500, color: '#374151', textDecoration: 'none' }}>{l.label}</a>
          ))}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            {currentUser ? (
              <button onClick={() => { setMenuOpen(false); currentLogout(); }} style={{ flex: 1, padding: '12px', borderRadius: 50, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontWeight: 600 }}>Đăng xuất</button>
            ) : (
              <button onClick={() => { setMenuOpen(false); setShowAuthModal(true); }} style={{ flex: 1, textAlign: 'center', padding: '12px', borderRadius: 50, border: '1.5px solid #F27024', background: 'transparent', color: '#F27024', fontWeight: 600 }}>Đăng nhập</button>
            )}
            {!currentUser && (
              <button onClick={() => { setMenuOpen(false); setShowAuthModal(true); }} style={{ flex: 1, textAlign: 'center', padding: '12px', borderRadius: 50, border: 'none', background: '#F27024', color: '#fff', fontWeight: 600 }}>Bắt đầu ngay</button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
