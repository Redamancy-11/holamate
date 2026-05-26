import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, setShowAuthModal, logout } = React.useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  const isHome = location.pathname === '/';
  const textColor = scrolled ? '#374151' : isHome ? 'rgba(255,255,255,.88)' : '#374151';
  const logoColor = scrolled ? '#F27024' : isHome ? '#fff' : '#F27024';

  let navLinks = [];
  if (user) {
    if (user.role === 'seller') {
      navLinks = [
        { label: 'Tính Năng', href: '/#features' },
        { label: 'Cách Hoạt Động', href: '/#how-it-works' },
        { label: 'Bản Đồ 🗺️', href: '/map', isRoute: true },
        { label: 'Kênh Người Bán 🏪', href: '/seller', isRoute: true }
      ];
    } else {
      navLinks = [
        { label: 'Tính Năng', href: '/#features' },
        { label: 'Cách Hoạt Động', href: '/#how-it-works' },
        { label: 'Bản Đồ 🗺️', href: '/map', isRoute: true },
        { label: 'Đặt Đồ 🍔', href: '/order', isRoute: true }
      ];
    }
  } else {
    navLinks = [
      { label: 'Tính Năng', href: '/#features' },
      { label: 'Cách Hoạt Động', href: '/#how-it-works' },
      { label: 'Bản Đồ 🗺️', href: '/map', isRoute: true },
      { label: 'Đặt Đồ 🍔', href: '/order', isRoute: true }
    ];
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
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(-1); }}
            style={{
              position: 'absolute', left: 16, top: 12, width: 40, height: 40, zIndex: 1200,
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: scrolled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.06)',
              border: scrolled ? '1px solid #E5E7EB' : '1px solid rgba(255,255,255,0.12)',
              color: scrolled ? '#374151' : '#fff', cursor: 'pointer', transition: 'all .18s ease',
              boxShadow: scrolled ? '0 6px 18px rgba(15,23,42,0.06)' : 'none'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
          >
            ←
          </button>
        )}

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: '1.25rem', color: logoColor, transition: 'color .3s ease', letterSpacing: '-0.02em' }}>
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
            <a key={l.label} href={l.href} style={{ padding: '8px 16px', borderRadius: 50, fontWeight: 500, fontSize: '.88rem', color: textColor, transition: 'all .25s ease' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F27024'; e.currentTarget.style.background = 'rgba(242,112,36,.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = textColor; e.currentTarget.style.background = 'transparent'; }}>
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="hide-mobile">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: scrolled ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)', padding: '4px 12px 4px 4px', borderRadius: 50 }}>
                <img src={user.avatar} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: textColor }}>{user.name}</span>
              </div>
              <button onClick={logout} style={{ padding: '8px 16px', borderRadius: 50, background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Đăng xuất</button>
            </div>
          ) : (
            <>
              <button onClick={() => setShowAuthModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 50, fontWeight: 500, fontSize: '.88rem', color: textColor, transition: 'color .25s ease' }}
                onMouseEnter={e => e.currentTarget.style.color = '#F27024'}
                onMouseLeave={e => e.currentTarget.style.color = textColor}>Sign In</button>
              <Link to="/planner" style={{ padding: '10px 22px', borderRadius: 50, background: '#F27024', color: '#fff', fontWeight: 600, fontSize: '.88rem', boxShadow: '0 4px 14px rgba(242,112,36,.32)', transition: 'all .25s ease', display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e05f15'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F27024'; e.currentTarget.style.transform = 'none'; }}>
                Get Started Free <span>→</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="show-mobile" onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5 }} aria-label="Toggle menu">
          {[0, 1, 2].map(i => (
            <span key={i} style={{ display: 'block', width: 22, height: 2, background: scrolled ? '#F27024' : '#fff', borderRadius: 2, transition: 'all .3s ease', transform: menuOpen ? (i === 0 ? 'translateY(7px) rotate(45deg)' : i === 2 ? 'translateY(-7px) rotate(-45deg)' : 'scaleX(0)') : 'none' }} />
          ))}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div style={{ background: '#fff', padding: '16px 24px 24px', borderTop: '1px solid #E5E7EB', animation: 'slideInDown .25s ease' }}>
          {navLinks.map(l => l.isRoute ? (
            <Link key={l.label} to={l.href} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #F3F4F6', fontWeight: 500, color: '#374151', textDecoration: 'none' }}>{l.label}</Link>
          ) : (
            <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #F3F4F6', fontWeight: 500, color: '#374151' }}>{l.label}</a>
          ))}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            {user ? (
              <button onClick={logout} style={{ flex: 1, padding: '12px', borderRadius: 50, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontWeight: 600 }}>Đăng xuất</button>
            ) : (
              <button onClick={() => { setMenuOpen(false); setShowAuthModal(true); }} style={{ flex: 1, textAlign: 'center', padding: '12px', borderRadius: 50, border: '1.5px solid #F27024', background: 'transparent', color: '#F27024', fontWeight: 600 }}>Sign In</button>
            )}
            <Link to="/planner" style={{ flex: 1, textAlign: 'center', padding: '12px', borderRadius: 50, background: '#F27024', color: '#fff', fontWeight: 600 }}>Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
