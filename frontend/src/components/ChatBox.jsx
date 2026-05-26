import React, { useState, useEffect, useRef } from 'react';
import { streamChat } from '../services/api';

const STORAGE_KEY_MESSAGES = 'hanomate_chat_messages';
const STORAGE_KEY_LOCATION = 'hanomate_chat_location';

const ChatBox = ({ defaultLocation = null }) => {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: 'Xin chào! 🍊 Tôi là HolaMate AI — trợ lý ẩm thực chuyên gợi ý món ăn, đồ uống và cung cấp các đánh giá review minh bạch, trung thực tại FPT Hoà Lạc. Bạn thèm ăn gì hôm nay để mình gợi ý quán ngon giá chuẩn kèm review chi tiết nhé?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingReply, setStreamingReply] = useState('');
  const [userLocation, setUserLocation] = useState(defaultLocation);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const bottomRef = useRef(null);

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

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingReply]);

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
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
    '🍜 Gợi ý lẩu nướng Tân Xã kèm review',
    '☕ Quán cafe học nhóm yên tĩnh quanh Hola',
    '🍳 Ăn gì hôm nay dưới 35k tại campus?',
    '🍊 Đánh giá Highlands Coffee Hola có gì ngon?',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', gap: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {suggestions.map((s, index) => (
          <button
            key={index}
            onClick={() => setInput(s)}
            style={{
              padding: '10px 18px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.09)', color: '#fff', cursor: 'pointer', fontSize: '.88rem', fontWeight: 600,
            }}
          >
            {s}
          </button>
        ))}
        <button
          onClick={handleLocateMe}
          disabled={locating}
          style={{
            padding: '10px 18px', borderRadius: 999, border: 'none', background: locating ? 'rgba(255,255,255,0.16)' : 'linear-gradient(135deg,#F27024,#FF5722)', color: '#fff', fontWeight: 800, cursor: locating ? 'not-allowed' : 'pointer', fontSize: '.88rem', boxShadow: '0 10px 20px rgba(242,112,36,0.24)',
          }}
        >
          {locating ? '⏳ Đang xác định...' : '📍 Dùng vị trí của tôi'}
        </button>
      </div>

      {userLocation && (
        <div style={{ padding: '12px 18px', borderRadius: 18, background: 'rgba(242,112,36,0.12)', color: '#FFB74D', textAlign: 'center', fontWeight: 600 }}>
          Vị trí hiện tại: {userLocation.latitude.toFixed(5)}°N, {userLocation.longitude.toFixed(5)}°E
        </div>
      )}
      {locError && (
        <div style={{ padding: '12px 18px', borderRadius: 18, background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', textAlign: 'center', fontWeight: 600 }}>
          {locError}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: '18px', borderRadius: 24, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 10 }}
          >
            {msg.role === 'ai' && (
              <div style={{ width: 34, height: 34, borderRadius: 14, background: 'linear-gradient(135deg,#F27024,#FF5722)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '.85rem' }}>
                O
              </div>
            )}
            <div style={{ maxWidth: '75%', padding: '16px 18px', borderRadius: 24, background: msg.role === 'user' ? 'linear-gradient(135deg,#F27024,#FF5722)' : 'rgba(255,255,255,0.08)', color: '#fff', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
              {msg.content}
            </div>
          </div>
        ))}

        {streamingReply && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 14, background: 'linear-gradient(135deg,#F27024,#FF5722)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '.85rem' }}>
              O
            </div>
            <div style={{ maxWidth: '75%', padding: '16px 18px', borderRadius: 24, background: 'rgba(255,255,255,0.08)', color: '#fff', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
              {streamingReply}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Hỏi AI Hola: thèm ăn vặt, tìm quán cafe học bài, trà sữa ngon kèm review..."
          style={{ flex: 1, padding: '16px 18px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#fff', outline: 'none', fontSize: '.95rem' }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{ padding: '16px 22px', borderRadius: 18, border: 'none', background: loading || !input.trim() ? 'rgba(255,255,255,0.14)' : 'linear-gradient(135deg,#F27024,#FF5722)', color: '#fff', fontWeight: 700, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', minWidth: 120 }}
        >
          {loading ? '⏳ Đang gửi...' : 'Gửi'}
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
