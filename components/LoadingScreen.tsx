import React from 'react';
import { Gauge } from 'lucide-react';

const LoadingScreen: React.FC = () => (
  <div className="loading-screen" role="status" aria-live="polite">
    <div className="loading-panel">
      <div className="loading-brand">
        <span className="loading-brand-icon"><Gauge size={22} aria-hidden="true" /></span>
        <span>
          <strong>APEX</strong>
          <small>MONEY · RACE CONTROL</small>
        </span>
      </div>

      <div className="loading-visual" aria-hidden="true">
        <img src="/apex-race-car.webp" alt="" width="1000" height="563" />
        <div className="loading-gauge">
          <div className="loading-gauge-ring">
            <div className="loading-gauge-inner">
              <Gauge size={20} strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>

      <p className="loading-kicker">SYSTEM INITIALIZATION</p>
      <h1>Đang chuẩn bị đường đua</h1>
      <p className="loading-description">Vui lòng đợi trong khi ứng dụng chuẩn bị dữ liệu của bạn.</p>
      <div className="loading-track" aria-hidden="true"><span /></div>
      <div className="loading-footer" aria-hidden="true">
        <span>RACE CONTROL</span>
        <span className="loading-footer-status"><i /> KHỞI ĐỘNG HỆ THỐNG</span>
      </div>
    </div>
  </div>
);

export default LoadingScreen;
