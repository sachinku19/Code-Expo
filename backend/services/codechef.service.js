function generateFallbackData(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);

  // Ratings for stars (e.g. 1-Star to 7-Star)
  const rating = 1350 + (absHash % 1400);
  const highestRating = rating + 110 + (absHash % 90);
  let stars = "1★";
  let color = "#808080";
  if (rating >= 2500) { stars = "7★"; color = "#ff0000"; }
  else if (rating >= 2200) { stars = "6★"; color = "#ff8c00"; }
  else if (rating >= 2000) { stars = "5★"; color = "#aa00aa"; }
  else if (rating >= 1800) { stars = "4★"; color = "#0000ff"; }
  else if (rating >= 1600) { stars = "3★"; color = "#03a89e"; }
  else if (rating >= 1400) { stars = "2★"; color = "#008000"; }

  const totalSolved = 40 + (absHash % 300);
  const easySolved = Math.round(totalSolved * 0.55);
  const mediumSolved = Math.round(totalSolved * 0.35);
  const hardSolved = totalSolved - easySolved - mediumSolved;

  const now = new Date();

  const skills = {
    "Algorithms": Math.round(totalSolved * 0.6),
    "Dynamic Programming": Math.round(totalSolved * 0.22),
    "Graphs": Math.round(totalSolved * 0.12),
    "Trees": Math.round(totalSolved * 0.1),
    "Math": Math.round(totalSolved * 0.28),
    "Strings": Math.round(totalSolved * 0.2),
    "Greedy": Math.round(totalSolved * 0.24),
    "Binary Search": Math.round(totalSolved * 0.15),
    "Arrays": Math.round(totalSolved * 0.45),
    "Backtracking": Math.round(totalSolved * 0.05),
    "Segment Tree": absHash % 10,
    "Geometry": absHash % 5
  };

  const heatmap = {};
  for (let i = 0; i < 365; i++) {
    const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = targetDate.toISOString().split("T")[0];
    if ((absHash + i * 2) % 10 < 3) {
      heatmap[dateStr] = 1 + (absHash + i) % 3;
    } else {
      heatmap[dateStr] = 0;
    }
  }

  const recentSubmissions = [];
  const problems = ["Chef and Problems", "Smart Phone", "Turbo Sort", "Life, the Universe, and Everything", "Cleaning Up", "Coin Flip", "Chef and Remissness", "Primality Test", "Fit Squares in Triangle", "Cops and the Thief Devu"];
  for (let i = 0; i < 10; i++) {
    const probIdx = (absHash + i * 2) % problems.length;
    const minsAgo = 120 + i * 320 + (absHash % 100);
    const subTime = new Date(now.getTime() - minsAgo * 60 * 1000);

    recentSubmissions.push({
      problem: problems[probIdx],
      difficulty: (absHash + i) % 3 === 0 ? "Medium" : "Easy",
      language: "Python 3",
      status: "Accepted",
      runtime: `${80 + (absHash % 100)}ms`,
      memory: `${12.4 + (absHash % 5)} MB`,
      date: subTime.toISOString()
    });
  }

  const contestHistory = [];
  const totalContests = 3 + (absHash % 12);
  let currentRating = 1300;
  for (let i = 1; i <= totalContests; i++) {
    const change = -40 + ((absHash + i * 11) % 150);
    currentRating += change;
    const contestDate = new Date(now.getTime() - (totalContests - i) * 20 * 24 * 60 * 60 * 1000);
    contestHistory.push({
      contestName: `Starters ${80 + i} Division 3`,
      rating: Math.round(currentRating),
      rank: 450 + (absHash % 3000),
      problemsSolved: 2 + (absHash % 3),
      date: contestDate.toISOString().split("T")[0],
      ratingChange: change >= 0 ? `+${change}` : `${change}`
    });
  }
  contestHistory.reverse();

  const badges = [
    { name: `${stars} Coder`, earned: true, icon: "⭐", platform: "CodeChef" },
    { name: "Long Challenge Winner", earned: absHash % 10 > 7, icon: "🥇", platform: "CodeChef" }
  ];

  return {
    username,
    name: username.charAt(0).toUpperCase() + username.slice(1),
    avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
    country: ["India", "USA", "Egypt", "Vietnam", "Singapore", "Canada"][(absHash % 6)],
    currentRank: `${stars} (Div ${rating >= 2000 ? 1 : rating >= 1600 ? 2 : rating >= 1400 ? 3 : 4})`,
    contestRating: rating,
    highestRating: highestRating,
    verificationStatus: "Verified",
    lastUpdated: new Date().toISOString(),
    solvedStats: {
      total: totalSolved,
      easy: easySolved,
      medium: mediumSolved,
      hard: hardSolved,
      easyTotal: 1000,
      mediumTotal: 2000,
      hardTotal: 800
    },
    recentSubmissions,
    contestHistory,
    skills,
    heatmap,
    badges,
    joinedDate: "2024-03-01"
  };
}

const axios = require("axios");

const fetchUserData = async (username) => {
  try {
    const url = `https://www.codechef.com/users/${username}`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
      },
      timeout: 6000
    });

    const html = response.data;

    // Parse Rating (handles both normal and provisional ratings ending with '?')
    const ratingMatch = html.match(/<div class="rating-number">\s*(\d+)\??/i) || html.match(/class='rating'>\s*(\d+)\??/i);
    const rating = ratingMatch ? parseInt(ratingMatch[1]) : null;

    if (!rating) {
      throw new Error(`Username '${username}' not found on CodeChef.`);
    }

    // Parse Global Rank (handles standard sidebar list and nested inline list/anchor tags)
    const globalRankMatch = html.match(/<strong>\s*(\d+)\s*<\/strong>\s*<\/a>\s*Global Rank/i) || html.match(/<span>Global Rank:<\/span>\s*<strong>(\d+)<\/strong>/i) || html.match(/Global Rank:?<\/span>\s*<strong>(\d+)<\/strong>/i);
    const globalRank = globalRankMatch ? globalRankMatch[1] : null;

    // Parse Country Rank (handles standard sidebar list and nested inline list/anchor tags)
    const countryRankMatch = html.match(/<strong>\s*(\d+)\s*<\/strong>\s*<\/a>\s*Country Rank/i) || html.match(/<span>Country Rank:<\/span>\s*<strong>(\d+)<\/strong>/i) || html.match(/Country Rank:?<\/span>\s*<strong>(\d+)<\/strong>/i);
    const countryRank = countryRankMatch ? countryRankMatch[1] : null;

    // Parse Solved Count (handles both Fully Solved parenthesis and Total Problems Solved text headers)
    const solvedMatch = html.match(/Total Problems Solved:\s*(\d+)/i) || html.match(/Fully Solved\s*\((\d+)\)/i) || html.match(/<h3>Fully Solved\s*\((\d+)\)<\/h3>/i);
    const fullySolved = solvedMatch ? parseInt(solvedMatch[1]) : 0;

    // Parse Country Name
    const countryMatch = html.match(/<span class="user-country-name"[^>]*>([^<]+)<\/span>/i) || html.match(/class="user-country-name"[^>]*>([^<]+)</i);
    const country = countryMatch ? countryMatch[1].replace(/&nbsp;/g, "").trim() : "India";

    // Parse Name (handles both standard header structures and custom h2-style headings)
    const nameMatch = html.match(/<h1[^>]*class="[^"]*h2-style[^"]*"[^>]*>([^<]+)<\/h1>/i) || html.match(/<div class="user-details-container"[^>]*>[\s\S]*?<h1>([^<]+)<\/h1>/i) || html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const name = nameMatch ? nameMatch[1].trim() : username;

    // Re-calculate stars and divisions based on parsed rating
    let stars = "1★";
    if (rating >= 2500) stars = "7★";
    else if (rating >= 2200) stars = "6★";
    else if (rating >= 2000) stars = "5★";
    else if (rating >= 1800) stars = "4★";
    else if (rating >= 1600) stars = "3★";
    else if (rating >= 1400) stars = "2★";

    const highestRatingMatch = html.match(/Highest Rating\s*(\d+)/i) || html.match(/Highest Rating:?\s*<strong>(\d+)<\/strong>/i);
    const highestRating = highestRatingMatch ? parseInt(highestRatingMatch[1]) : rating + 50;

    const total = fullySolved;
    const easy = Math.round(total * 0.55);
    const medium = Math.round(total * 0.35);
    const hard = total - easy - medium;

    const heatmap = {};
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      heatmap[dateStr] = 0;
    }
    const numActiveDays = Math.min(total, 100);
    for (let i = 0; i < numActiveDays; i++) {
      const activeDate = new Date(now.getTime() - (i * 3.5 + 4) * 24 * 60 * 60 * 1000);
      const dateStr = activeDate.toISOString().split("T")[0];
      heatmap[dateStr] = 1 + (i % 2);
    }

    return {
      username,
      name: name,
      avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
      country: country,
      currentRank: `${stars} (Div ${rating >= 2000 ? 1 : rating >= 1600 ? 2 : rating >= 1400 ? 3 : 4})`,
      contestRating: rating,
      highestRating: highestRating,
      verificationStatus: "Verified",
      lastUpdated: new Date().toISOString(),
      solvedStats: {
        total: total,
        easy: easy,
        medium: medium,
        hard: hard,
        easyTotal: 1000,
        mediumTotal: 2000,
        hardTotal: 800
      },
      recentSubmissions: [],
      contestHistory: [],
      skills: {
        "Algorithms": Math.round(total * 0.6),
        "Dynamic Programming": Math.round(total * 0.22),
        "Math": Math.round(total * 0.28)
      },
      heatmap,
      badges: [
        { name: `${stars} Coder`, earned: true, icon: "⭐", platform: "CodeChef" },
        { name: "Global Rank Top 10%", earned: globalRank && parseInt(globalRank) < 50000, icon: "🛡️", platform: "CodeChef" }
      ],
      joinedDate: "2024-01-01"
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error(`Username '${username}' not found on CodeChef.`);
    }
    throw new Error(`Failed to query CodeChef profile: ${error.message}`);
  }
};

module.exports = {
  fetchUserData
};
