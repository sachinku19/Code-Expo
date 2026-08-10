import React from "react";
import MobileNavbar from "./MobileNavbar";
import MobileHero from "./MobileHero";
import MobileStats from "./MobileStats";
import MobileDevelopers from "./MobileDevelopers";
import MobileWorkspace from "./MobileWorkspace";
import MobileRoomCollaborationShowcase from "./MobileRoomCollaborationShowcase";
import MobileFeatures from "./MobileFeatures";
import MobileNetworkFeedShowcase from "./MobileNetworkFeedShowcase";
import MobileAnalytics from "./MobileAnalytics";
import MobilePricing from "./MobilePricing";
import MobileTestimonials from "./MobileTestimonials";
import MobileCTA from "./MobileCTA";
import MobileFooter from "./MobileFooter";
import "./MobileLandingPage.css";

export default function MobileLandingPage({ user, theme, toggleTheme, dbStats, totalUser, reviews }) {
  return (
    <div className={`mobile-landing-root ${theme === "light" ? "light-theme" : "dark-theme"}`}>
      {/* 1. Mobile Navbar & Fullscreen Drawer */}
      <MobileNavbar user={user} theme={theme} toggleTheme={toggleTheme} />

      {/* Main Content Sections */}
      <main className="mobile-landing-main">
        {/* 2. Hero Section */}
        <MobileHero user={user} totalUser={totalUser} />

        {/* 3. Live Developer Stories Tray */}
        <MobileDevelopers />

        {/* 4. Live Statistics */}
        <MobileStats dbStats={dbStats} totalUser={totalUser} />

        {/* 5. Floating Workspace (Multi-File Sandbox) */}
        <MobileWorkspace />

        {/* 5.5 Room Collaboration Hub (Meeting & Chat Showcase) */}
        <MobileRoomCollaborationShowcase />

        {/* 6. Features (CRDT Sync, Video Calls, Whiteboard, Feed) */}
        <MobileFeatures />

        {/* 6.5 Network Feed and Feature Carousel */}
        <MobileNetworkFeedShowcase />

        {/* 7. Analytics Dashboard */}
        <MobileAnalytics />

        {/* 8. Pricing Plans */}
        <MobilePricing user={user} />

        {/* 9. Client Testimonials */}
        <MobileTestimonials reviews={reviews} />

        {/* 10. Final CTA */}
        <MobileCTA user={user} />
      </main>

      {/* 11. Mobile Footer */}
      <MobileFooter />
    </div>
  );
}
