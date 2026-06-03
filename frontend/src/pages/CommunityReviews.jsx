import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import {
  getCommunityReviews,
  createCommunityReview,
  voteCommunityReview,
  reportCommunityReview,
  getVendors,
  getStudentStoresPublic
} from '../services/api';

const CommunityReviews = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setShowAuthModal } = useContext(AuthContext);

  // Reviews states
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dropdown list targets
  const [vendorsList, setVendorsList] = useState([]);
  const [stallsList, setStallsList] = useState([]);

  // Active filters
  const [filterType, setFilterType] = useState('all'); // all, vendor, student_store, dish
  const [searchTarget, setSearchTarget] = useState('');

  // Modals state
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(null); // stores review object to report

  // Write Review form state
  const [writeType, setWriteType] = useState('vendor'); // 'vendor', 'student_store', 'dish'
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedStallId, setSelectedStallId] = useState('');
  const [selectedDishName, setSelectedDishName] = useState('');
  const [dishParentType, setDishParentType] = useState('vendor'); // 'vendor' or 'student_store' parent for dish
  const [writeRating, setWriteRating] = useState(5);
  const [writeContent, setWriteContent] = useState('');
  const [writeImages, setWriteImages] = useState([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [writeAnonymous, setWriteAnonymous] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Report Form state
  const [reportReason, setReportReason] = useState('spam');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
    fetchTargets();
    
    // Check if query params ask to open write modal
    const params = new URLSearchParams(location.search);
    if (params.get('write') === 'true') {
      if (!user) {
        setShowAuthModal(true);
      } else {
        setShowWriteModal(true);
      }
    }
  }, [location]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await getCommunityReviews();
      setReviews(res.data || []);
    } catch (err) {
      console.error('Fetch community reviews error:', err);
      setError('Không thể tải các đánh giá cộng đồng.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTargets = async () => {
    try {
      const v = await getVendors();
      setVendorsList((v || []).filter(item => item.source !== 'student' && item.category !== 'Cửa hàng sinh viên'));
      
      const s = await getStudentStoresPublic();
      setStallsList(s.data || []);
    } catch (err) {
      console.error('Fetch targets error:', err);
    }
  };

  const handleVote = async (reviewId, stars) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await voteCommunityReview(reviewId, stars);
      if (res.success) {
        // Update vote stats in real-time on UI
        setReviews(prev => prev.map(r => {
          if (r.id === reviewId) {
            return {
              ...r,
              average_vote: res.data.average_vote,
              total_votes: res.data.total_votes,
              user_vote: stars
            };
          }
          return r;
        }));
      }
    } catch (err) {
      console.error('Vote usefulness error:', err);
      alert(err.response?.data?.error || 'Có lỗi xảy ra khi gửi vote.');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!showReportModal) return;

    setReportSubmitting(true);
    try {
      const res = await reportCommunityReview(showReportModal.id, {
        reason: reportReason,
        description: reportDesc
      });
      if (res.success) {
        alert('Báo cáo của bạn đã được gửi thành công. Cảm ơn bạn đã hỗ trợ cộng đồng!');
        setShowReportModal(null);
        setReportDesc('');
      }
    } catch (err) {
      console.error('Report error:', err);
      alert(err.response?.data?.error || 'Có lỗi xảy ra khi báo cáo.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setWriteImages([...writeImages, imageUrlInput.trim()]);
    setImageUrlInput('');
  };

  const handleRemoveImage = (index) => {
    setWriteImages(writeImages.filter((_, i) => i !== index));
  };

  const handleWriteSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setFormError('');
    setFormSuccess('');

    // Validations
    if (!writeContent.trim()) {
      setFormError('Vui lòng điền nội dung đánh giá.');
      return;
    }

    if (writeType === 'vendor' && !selectedVendorId) {
      setFormError('Vui lòng chọn cửa hàng đối tác để đánh giá.');
      return;
    }

    if (writeType === 'student_store' && !selectedStallId) {
      setFormError('Vui lòng chọn gian hàng sinh viên để đánh giá.');
      return;
    }

    if (writeType === 'dish') {
      if (!selectedDishName.trim()) {
        setFormError('Vui lòng nhập tên món ăn/sản phẩm.');
        return;
      }
      if (dishParentType === 'vendor' && !selectedVendorId) {
        setFormError('Vui lòng chọn quán bán món ăn này.');
        return;
      }
      if (dishParentType === 'student_store' && !selectedStallId) {
        setFormError('Vui lòng chọn gian hàng sinh viên bán món ăn này.');
        return;
      }
    }

    setFormSubmitting(true);
    try {
      const payload = {
        review_type: writeType === 'dish' ? 'dish' : writeType,
        vendor_id: (writeType === 'vendor' || (writeType === 'dish' && dishParentType === 'vendor')) ? selectedVendorId : null,
        student_store_id: (writeType === 'student_store' || (writeType === 'dish' && dishParentType === 'student_store')) ? selectedStallId : null,
        dish_name: writeType === 'dish' ? selectedDishName : null,
        rating: writeRating,
        content: writeContent,
        images: writeImages,
        is_anonymous: writeAnonymous
      };

      const res = await createCommunityReview(payload);
      if (res.success) {
        setFormSuccess(res.message);
        // Refresh reviews list
        fetchReviews();
        // Clear fields
        setWriteContent('');
        setWriteImages([]);
        setSelectedDishName('');
        setWriteAnonymous(false);
        // Close modal after delay
        setTimeout(() => {
          setShowWriteModal(false);
          setFormSuccess('');
        }, 1500);
      }
    } catch (err) {
      console.error('Create review error:', err);
      setFormError(err.response?.data?.error || 'Không thể đăng đánh giá của bạn.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Find Target name from review
  const getReviewTargetName = (review) => {
    if (review.review_type === 'vendor') {
      const v = vendorsList.find(item => item.id === review.vendor_id);
      return v ? v.name : 'Quán ăn đối tác';
    }
    if (review.review_type === 'student_store') {
      const s = stallsList.find(item => item.id === review.student_store_id);
      return s ? s.store_name : 'Gian hàng sinh viên';
    }
    if (review.review_type === 'dish') {
      if (review.vendor_id) {
        const v = vendorsList.find(item => item.id === review.vendor_id);
        return `Món "${review.dish_name}" - ${v ? v.name : 'Quán đối tác'}`;
      } else {
        const s = stallsList.find(item => item.id === review.student_store_id);
        return `Món "${review.dish_name}" - ${s ? s.store_name : 'Gian hàng sinh viên'}`;
      }
    }
    return 'HolaFood';
  };

  const getReviewTargetLabel = (review) => {
    if (review.review_type === 'vendor') return 'Quán ăn';
    if (review.review_type === 'student_store') return 'Gian hàng SV';
    if (review.review_type === 'dish') return 'Món ăn';
    return 'Tổng quan';
  };

  // Filtered reviews list
  const filteredReviews = reviews.filter(rev => {
    // Filter by type
    if (filterType !== 'all' && rev.review_type !== filterType) {
      return false;
    }

    // Filter by search target name
    if (searchTarget) {
      const targetName = getReviewTargetName(rev).toLowerCase();
      const contentText = rev.content.toLowerCase();
      const dishName = (rev.dish_name || '').toLowerCase();
      const query = searchTarget.toLowerCase();
      return targetName.includes(query) || contentText.includes(query) || dishName.includes(query);
    }

    return true;
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0704',
      backgroundImage: 'radial-gradient(circle at 90% 20%, rgba(16, 185, 129, 0.05) 0%, transparent 60%)',
      paddingTop: '100px',
      paddingBottom: '60px',
      color: '#fff'
    }}>
      <div className="container" style={{ maxWidth: '960px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* Page title */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }} className="animate-fade-up">
          <span style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10B981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '50px',
            padding: '6px 16px',
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            display: 'inline-block',
            marginBottom: '16px'
          }}>
            💬 Review Minh Bạch - Chọn Đúng Vị
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, marginBottom: '14px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Đánh Giá Từ Cộng Đồng
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '600px', margin: '0 auto 30px', fontSize: '0.96rem' }}>
            Nơi tổng hợp các đánh giá đồ ăn, thức uống thực tế nhất từ sinh viên FPT Hoà Lạc. Không seeding, không quảng cáo khống.
          </p>

          {/* Action Write review & search */}
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            maxWidth: '650px',
            margin: '0 auto'
          }}>
            <div style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50px',
              padding: '6px 12px 6px 18px',
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              minWidth: '260px'
            }}>
              <span style={{ fontSize: '1rem', marginRight: '8px' }}>🔍</span>
              <input
                type="text"
                placeholder="Tìm review theo tên quán, món ăn..."
                value={searchTarget}
                onChange={e => setSearchTarget(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  width: '100%',
                  fontSize: '0.88rem'
                }}
              />
            </div>

            <button
              onClick={() => {
                if (!user) {
                  setShowAuthModal(true);
                } else {
                  setShowWriteModal(true);
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                padding: '12px 28px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
            >
              <span>✍️</span> Viết Đánh Giá Của Bạn
            </button>
          </div>
        </div>

        {/* Tab switchers */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '30px',
          gap: '16px'
        }} className="reveal">
          {[
            { val: 'all', lbl: 'Tất cả review' },
            { val: 'vendor', lbl: 'Đánh giá quán ăn' },
            { val: 'student_store', lbl: 'Gian hàng sinh viên' },
            { val: 'dish', lbl: 'Đánh giá món ăn' }
          ].map(tab => (
            <button
              key={tab.val}
              onClick={() => setFilterType(tab.val)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: filterType === tab.val ? '3px solid #10B981' : '3px solid transparent',
                color: filterType === tab.val ? '#fff' : 'rgba(255,255,255,0.5)',
                fontWeight: 700,
                fontSize: '0.92rem',
                padding: '10px 4px 12px 4px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.lbl}
            </button>
          ))}
        </div>

        {/* Reviews Feed */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <div className="spinner" style={{ borderTopColor: '#10B981', margin: '0 auto 16px' }} />
            <span>Đang tải các đánh giá...</span>
          </div>
        ) : error ? (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '20px', borderRadius: '16px', color: '#EF4444', textAlign: 'center' }}>
            {error}
          </div>
        ) : filteredReviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '24px', color: 'rgba(255,255,255,0.4)' }}>
            Chưa có đánh giá nào phù hợp với bộ lọc 💬
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="reveal">
            {filteredReviews.map(review => {
              const targetName = getReviewTargetName(review);
              const label = getReviewTargetLabel(review);
              return (
                <div
                  key={review.id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                  }}
                >
                  {/* Top Header of review */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <img
                        src={review.reviewer_avatar || 'https://ui-avatars.com/api/?name=An+Danh'}
                        alt="Reviewer avatar"
                        style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#2B231F' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
                          {review.reviewer_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                          {new Date(review.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>

                    {/* Stars */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ color: '#FFB800', fontWeight: 800, fontSize: '0.95rem' }}>
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </span>
                      {review.status === 'pending' && (
                        <span style={{ fontSize: '0.68rem', color: '#FF9800', background: 'rgba(255,152,0,0.1)', padding: '2px 8px', borderRadius: '4px', marginTop: '4px' }}>
                          Đang chờ duyệt ảnh
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Target block */}
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '10px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: review.review_type === 'student_store' ? 'rgba(16,185,129,0.12)' : 'rgba(242,112,36,0.12)',
                      color: review.review_type === 'student_store' ? '#10B981' : '#F27024',
                      padding: '3px 8px',
                      borderRadius: '50px',
                      textTransform: 'uppercase'
                    }}>
                      {label}
                    </span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                      {targetName}
                    </span>
                  </div>

                  {/* Review content */}
                  <p style={{
                    fontSize: '0.94rem',
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: '1.6',
                    marginBottom: '16px',
                    whiteSpace: 'pre-line'
                  }}>
                    {review.content}
                  </p>

                  {/* Review Images */}
                  {Array.isArray(review.images) && review.images.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      {review.images.map((img, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.08)'
                          }}
                        >
                          <img
                            src={img}
                            alt={`Review ${idx}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80'; }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer tools: usefulness upvote + report */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    paddingTop: '16px',
                    fontSize: '0.85rem'
                  }}>
                    {/* Usefulness vote */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Cộng đồng đánh giá độ hữu ích:</span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[1, 2, 3, 4, 5].map(starNum => {
                          const active = (review.user_vote || 0) >= starNum || (!review.user_vote && review.average_vote >= starNum);
                          return (
                            <button
                              key={starNum}
                              onClick={() => handleVote(review.id, starNum)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: active ? '#FFB800' : 'rgba(255,255,255,0.2)',
                                fontSize: '1.05rem', padding: '0 2px', transition: 'all 0.1s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                              title={`Vote ${starNum} sao hữu ích`}
                            >
                              ★
                            </button>
                          );
                        })}
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginLeft: '6px' }}>
                        ({review.average_vote.toFixed(1)}/5 từ {review.total_votes} lượt)
                      </span>
                    </div>

                    {/* Report action */}
                    <button
                      onClick={() => setShowReportModal(review)}
                      style={{
                        background: 'none', border: 'none', color: 'rgba(239,68,68,0.6)',
                        cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(239,68,68,0.6)'}
                    >
                      🚩 Báo cáo vi phạm
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Write Review Dialog Modal */}
      {showWriteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(16px)',
          zIndex: 2000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }} onClick={() => setShowWriteModal(false)}>
          <div style={{
            background: '#0F0B09',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '550px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            padding: '30px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            animation: 'scaleIn 0.25s ease-out'
          }} onClick={e => e.stopPropagation()}>
            
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>✍️</span> Viết Đánh Giá Mới
            </h2>

            {formError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '12px 16px', borderRadius: '10px', color: '#EF4444', fontSize: '0.85rem', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            {formSuccess && (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '12px 16px', borderRadius: '10px', color: '#10B981', fontSize: '0.85rem', marginBottom: '16px' }}>
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleWriteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Type Switcher */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>BẠN MUỐN ĐÁNH GIÁ GÌ?</label>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '3px' }}>
                  {[
                    { val: 'vendor', lbl: 'Quán ăn' },
                    { val: 'student_store', lbl: 'Gian hàng SV' },
                    { val: 'dish', lbl: 'Món ăn cụ thể' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setWriteType(opt.val)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: writeType === opt.val ? '#10B981' : 'transparent',
                        color: writeType === opt.val ? '#fff' : 'rgba(255,255,255,0.5)',
                        fontWeight: 700, fontSize: '0.82rem'
                      }}
                    >
                      {opt.lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Dropdown based on type selection */}
              {writeType === 'vendor' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>CHỌN QUÁN ĂN / CAFE</label>
                  <select
                    value={selectedVendorId}
                    onChange={e => setSelectedVendorId(e.target.value)}
                    style={{ width: '100%', background: '#1F1714', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px', color: '#fff', outline: 'none' }}
                  >
                    <option value="">-- Chọn quán ăn --</option>
                    {vendorsList.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {writeType === 'student_store' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>CHỌN GIAN HÀNG SINH VIÊN</label>
                  <select
                    value={selectedStallId}
                    onChange={e => setSelectedStallId(e.target.value)}
                    style={{ width: '100%', background: '#1F1714', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px', color: '#fff', outline: 'none' }}
                  >
                    <option value="">-- Chọn gian hàng sinh viên --</option>
                    {stallsList.map(s => (
                      <option key={s.id} value={s.id}>{s.store_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {writeType === 'dish' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Dish parent type */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '6px' }}>MÓN NÀY CỦA AI BÁN?</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="radio" name="dishParent" checked={dishParentType === 'vendor'} onChange={() => setDishParentType('vendor')} style={{ accentColor: '#10B981' }} />
                        <span>Quán đối tác</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="radio" name="dishParent" checked={dishParentType === 'student_store'} onChange={() => setDishParentType('student_store')} style={{ accentColor: '#10B981' }} />
                        <span>Gian hàng sinh viên</span>
                      </label>
                    </div>
                  </div>

                  {/* Parent select */}
                  {dishParentType === 'vendor' ? (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '6px' }}>CHỌN QUÁN ĂN</label>
                      <select
                        value={selectedVendorId}
                        onChange={e => setSelectedVendorId(e.target.value)}
                        style={{ width: '100%', background: '#1F1714', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px', color: '#fff', outline: 'none' }}
                      >
                        <option value="">-- Chọn quán ăn --</option>
                        {vendorsList.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '6px' }}>CHỌN GIAN HÀNG</label>
                      <select
                        value={selectedStallId}
                        onChange={e => setSelectedStallId(e.target.value)}
                        style={{ width: '100%', background: '#1F1714', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px', color: '#fff', outline: 'none' }}
                      >
                        <option value="">-- Chọn gian hàng --</option>
                        {stallsList.map(s => (
                          <option key={s.id} value={s.id}>{s.store_name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Dish name input */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '6px' }}>TÊN MÓN ĂN / SẢN PHẨM</label>
                    <input
                      type="text"
                      placeholder="VD: Cơm gà thố, Trà sữa thái..."
                      value={selectedDishName}
                      onChange={e => setSelectedDishName(e.target.value)}
                      style={{ width: '100%', background: '#1F1714', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 14px', color: '#fff', outline: 'none' }}
                    />
                  </div>

                </div>
              )}

              {/* Rating selection (Stars) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>ĐÁNH GIÁ CỦA BẠN</label>
                <div style={{ display: 'flex', gap: '8px', fontSize: '1.8rem' }}>
                  {[1, 2, 3, 4, 5].map(starNum => (
                    <button
                      key={starNum}
                      type="button"
                      onClick={() => setWriteRating(starNum)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: writeRating >= starNum ? '#FFB800' : 'rgba(255,255,255,0.2)'
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>NỘI DUNG ĐÁNH GIÁ</label>
                <textarea
                  rows={4}
                  placeholder="Hãy chia sẻ trải nghiệm thực tế của bạn về chất lượng món ăn, phục vụ hoặc giá tiền..."
                  value={writeContent}
                  onChange={e => setWriteContent(e.target.value)}
                  style={{
                    width: '100%', background: '#1F1714', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px', padding: '12px 14px', color: '#fff', outline: 'none',
                    lineHeight: '1.5', resize: 'vertical'
                  }}
                />
              </div>

              {/* Attached Images Mock */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>ĐÍNH KÈM ẢNH REVIEW (NẾU CÓ)</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="Dán link URL ảnh (Unsplash, Imgur...)"
                    value={imageUrlInput}
                    onChange={e => setImageUrlInput(e.target.value)}
                    style={{ flex: 1, background: '#1F1714', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 14px', color: '#fff', outline: 'none', fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    style={{ background: '#10B981', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, padding: '0 16px', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Thêm
                  </button>
                </div>
                {/* Images list preview */}
                {writeImages.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px' }}>
                    {writeImages.map((imgUrl, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden' }}>
                        <img src={imgUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          style={{ position: 'absolute', top: 0, right: 0, width: '16px', height: '16px', background: '#EF4444', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Anonymity */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="checkbox"
                  checked={writeAnonymous}
                  onChange={e => setWriteAnonymous(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#10B981' }}
                />
                <span>Đăng đánh giá ẩn danh (giấu danh tính)</span>
              </label>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowWriteModal(false)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{ flex: 2, background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {formSubmitting ? 'Đang gửi...' : 'Đăng đánh giá'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Report Violated Review Dialog Modal */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(16px)',
          zIndex: 2000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }} onClick={() => setShowReportModal(null)}>
          <div style={{
            background: '#0F0B09',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            position: 'relative',
            padding: '30px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            animation: 'scaleIn 0.25s ease-out'
          }} onClick={e => e.stopPropagation()}>
            
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#EF4444', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🚩</span> Báo Cáo Vi Phạm
            </h2>

            <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>LÝ DO BÁO CÁO</label>
                <select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  style={{ width: '100%', background: '#1F1714', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px', color: '#fff', outline: 'none' }}
                >
                  <option value="spam">Nội dung rác (Spam) hoặc trùng lặp</option>
                  <option value="seeding">Seeding quảng cáo giả mạo</option>
                  <option value="competitor_sabotage">Dìm hàng đối thủ cạnh tranh</option>
                  <option value="false_info">Thông tin sai sự thật / giá cả ảo</option>
                  <option value="offensive">Ngôn từ công kích cá nhân / xúc phạm</option>
                  <option value="sensitive_info">Chứa thông tin nhạy cảm / sđt riêng tư</option>
                  <option value="fake_account">Tài khoản giả mạo (Clone)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '8px' }}>MÔ TẢ CHI TIẾT (TÙY CHỌN)</label>
                <textarea
                  rows={3}
                  placeholder="Vui lòng cung cấp thêm chi tiết để quản trị viên kiểm duyệt chuẩn xác..."
                  value={reportDesc}
                  onChange={e => setReportDesc(e.target.value)}
                  style={{
                    width: '100%', background: '#1F1714', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px', padding: '12px 14px', color: '#fff', outline: 'none',
                    lineHeight: '1.4', resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowReportModal(null)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  style={{ flex: 1.5, background: '#EF4444', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {reportSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CommunityReviews;
