import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import HeroSection from '../components/sections/HeroSection';
import FeaturesSection from '../components/sections/FeaturesSection';
import HowItWorksSection from '../components/sections/HowItWorksSection';
import ReviewsSection from '../components/sections/ReviewsSection';
import CtaSection from '../components/sections/CtaSection';
import FooterSection from '../components/sections/FooterSection';
import VendorSection from '../components/sections/VendorSection';

const Home = () => {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
    }, { threshold: 0.12 });
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <VendorSection />
      <HowItWorksSection />
      <ReviewsSection />
      <CtaSection />
      <FooterSection />
    </>
  );
};

export default Home;
