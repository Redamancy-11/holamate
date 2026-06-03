import React, { useState, useEffect, useRef } from 'react';
import { streamChat } from '../services/api';

const STORAGE_KEY_MESSAGES = 'hanomate_chat_messages';
const STORAGE_KEY_LOCATION = 'hanomate_chat_location';

const ChatBox = ({ defaultLocation = null }) => {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: 'Xin chào! 🍊 Tôi là HolaMate AI — trợ lý ẩm thực chuyên gợi ý món ăn, đồ uống và cung cấp các đánh giá minh bạch tại FPT Hoà Lạc. Bạn thèm ăn gì hôm nay?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingReply, setStreamingReply] = useState('');
  const [userLocation, setUserLocation] = useState(defaultLocation);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);
    const savedLocation = localStorage.getItem(STORAGE_KEY_LOCATION);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch {}
    }
    if (!defaultLocation && savedLocation) {
      try {
        const parsedLocation = JSON.parse(savedLocation);
        if (parsedLocation && parsedLocation.latitude && parsedLocation.longitude) {
          setUserLocation(parsedLocation);
        }
      } catch {}
    }
  }, [defaultLocation]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (userLocation) {
      localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(userLocation));
    }
  }, [userLocation]);

  const isAtBottom = useRef(true);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // Nếu cách đáy dưới 120px thì coi như đang ở đáy
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 120;
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Cuộn mượt khi có tin nhắn mới hoàn tất
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
      isAtBottom.current = true;
    }
  }, [messages]);

  // Cuộn tức thì (không smooth để tránh giật lag khi stream liên tục) nếu đang ở đáy
  useEffect(() => {
    if (messagesContainerRef.current && isAtBottom.current && streamingReply) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'auto',
      });
    }
  }, [streamingReply]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocError('Trình duyệt không hỗ trợ GPS.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(location);
        setLocating(false);
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: `📍 Đã ghi nhận vị trí của bạn: ${location.latitude.toFixed(5)}°N, ${location.longitude.toFixed(5)}°E. Tôi sẽ dùng vị trí này để gợi ý các quán ăn gần bạn nhất.`,
          },
        ]);
      },
      (err) => {
        setLocating(false);
        const msg = {
          1: 'Bạn đã từ chối quyền GPS. Vui lòng cho phép quyền truy cập vị trí.',
          2: 'Không lấy được tín hiệu GPS. Vui lòng thử lại.',
          3: 'GPS quá hạn. Hãy thử lại sau.',
        };
        setLocError(msg[err.code] || 'Lỗi GPS không xác định.');
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    const nextMessages = [...messages, { role: 'user', content: userMessage }];
    setInput('');
    setMessages(nextMessages);
    setLoading(true);
    setStreamingReply('');

    let partialReply = '';
    try {
      await streamChat(
        userMessage,
        nextMessages,
        (chunk) => {
          partialReply += chunk;
          setStreamingReply(partialReply);
        },
        () => {
          setMessages((prev) => [
            ...prev,
            { role: 'ai', content: partialReply || 'Xin lỗi, hiện tại không có phản hồi.' },
          ]);
          setStreamingReply('');
          setLoading(false);
        },
        (errorMessage) => {
          setMessages((prev) => [
            ...prev,
            { role: 'ai', content: `❌ Có lỗi xảy ra: ${errorMessage}` },
          ]);
          setStreamingReply('');
          setLoading(false);
        },
        userLocation
      );
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: '❌ Có lỗi xảy ra. Vui lòng thử lại.' },
      ]);
      setStreamingReply('');
      setLoading(false);
    }
  };

  const suggestions = [
    '💰 Có 35k muốn ăn no gần KTX',
    '🛵 Đồ ăn đêm tránh giao chậm',
    '🏫 Có gian hàng sinh viên nào bán đồ uống hôm nay?',
    '🌶️ Ăn nhẹ, không cay, gần FPTU',
    '👥 Quán đi nhóm 4 người giá sinh viên',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 12, width: '100%', height: '100%' }}>
      {/* Suggestions and Locate Button */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {suggestions.map((s, index) => (
          <button
            key={index}
            onClick={() => setInput(s)}
            style={{
              padding: '8px 14px', borderRadius: 999, 
              border: '1px solid rgba(255,255,255,0.08)', 
              background: 'rgba(255,255,255,0.04)', 
              color: 'rgba(255,255,255,0.85)', 
              cursor: 'pointer', fontSize: '.78rem', fontWeight: 600,
              transition: 'all 0.25s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(242,112,36,0.1)';
              e.currentTarget.style.borderColor = 'rgba(242,112,36,0.4)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
            }}
          >
            {s}
          </button>
        ))}
        <button
          onClick={handleLocateMe}
          disabled={locating}
          style={{
            padding: '8px 14px', borderRadius: 999, border: 'none', 
            background: locating ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg, #F27024, #FF5722)', 
            color: '#fff', fontWeight: 800, 
            cursor: locating ? 'not-allowed' : 'pointer', fontSize: '.78rem', 
            boxShadow: '0 8px 20px rgba(242,112,36,0.3)',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={e => {
            if (!locating) e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            if (!locating) e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {locating ? '⏳ Đang xác định...' : '📍 Vị trí hiện tại'}
        </button>
      </div>

      {userLocation && (
        <div style={{ 
          padding: '8px 14px', borderRadius: 12, 
          background: 'rgba(242, 112, 36, 0.08)', 
          border: '1px solid rgba(242, 112, 36, 0.25)', 
          color: '#FFB74D', textAlign: 'center', fontWeight: 600, fontSize: '0.78rem'
        }}>
          🎯 Đã kết nối định vị GPS: {userLocation.latitude.toFixed(5)}°N, {userLocation.longitude.toFixed(5)}°E (Gợi ý dựa trên tọa độ thực tế)
        </div>
      )}
      {locError && (
        <div style={{ 
          padding: '8px 14px', borderRadius: 12, 
          background: 'rgba(239, 68, 68, 0.08)', 
          border: '1px solid rgba(239, 68, 68, 0.25)', 
          color: '#FCA5A5', textAlign: 'center', fontWeight: 600, fontSize: '0.78rem' 
        }}>
          {locError}
        </div>
      )}

      {/* Messages Window (Glassmorphic) */}
      <div 
        ref={messagesContainerRef}
        style={{ 
          flex: 1, minHeight: 0, height: 'auto', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, 
          padding: '16px', borderRadius: 20, 
          background: 'rgba(15, 23, 42, 0.45)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)', 
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 10 }}
          >
            {msg.role === 'ai' && (
              <div style={{ 
                width: 32, height: 32, borderRadius: 10, 
                background: 'linear-gradient(135deg, #F27024, #FF5722)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                color: '#fff', fontWeight: 900, fontSize: '.85rem',
                boxShadow: '0 4px 12px rgba(242,112,36,0.3)'
              }}>
                🤖
              </div>
            )}
            <div style={{ 
              maxWidth: '78%', padding: '12px 16px', borderRadius: 16, 
              background: msg.role === 'user' ? 'linear-gradient(135deg, #F27024, #FF5722)' : 'rgba(255,255,255,0.04)', 
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)',
              color: '#fff', whiteSpace: 'pre-line', lineHeight: 1.5, fontSize: '0.88rem',
              boxShadow: msg.role === 'user' ? '0 4px 15px rgba(242,112,36,0.2)' : 'none'
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {streamingReply && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 10 }}>
            <div style={{ 
              width: 32, height: 32, borderRadius: 10, 
              background: 'linear-gradient(135deg, #F27024, #FF5722)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              color: '#fff', fontWeight: 900, fontSize: '.85rem',
              boxShadow: '0 4px 12px rgba(242,112,36,0.3)'
            }}>
              🤖
            </div>
            <div style={{ 
              maxWidth: '78%', padding: '12px 16px', borderRadius: 16, 
              background: 'rgba(255,255,255,0.04)', 
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#fff', whiteSpace: 'pre-line', lineHeight: 1.5, fontSize: '0.88rem'
            }}>
              {streamingReply}
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingBottom: 4 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Hỏi AI Hola: thèm ăn vặt, tìm quán cafe học bài, lẩu nướng gần đây..."
          style={{ 
            flex: 1, padding: '14px 18px', borderRadius: 14, 
            border: '1px solid rgba(255,255,255,0.08)', 
            background: 'rgba(255,255,255,0.03)', 
            color: '#fff', outline: 'none', fontSize: '.9rem',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'rgba(242,112,36,0.5)'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{ 
            padding: '14px 22px', borderRadius: 14, border: 'none', 
            background: loading || !input.trim() ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #F27024, #FF5722)', 
            color: loading || !input.trim() ? 'rgba(255,255,255,0.3)' : '#fff', 
            fontWeight: 700, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', 
            minWidth: 80,
            boxShadow: loading || !input.trim() ? 'none' : '0 4px 15px rgba(242,112,36,0.3)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            if (!loading && input.trim()) e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            if (!loading && input.trim()) e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {loading ? '⏳' : 'Gửi'}
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
