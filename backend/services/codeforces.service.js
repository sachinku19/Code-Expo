const axios = require("axios");

function generateFallbackData(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);

  const rating = 1200 + (absHash % 1200);
  const highestRating = rating + 120 + (absHash % 150);
  
  let rank = "Newbie";
  let color = "#808080";
  if (rating >= 2400) { rank = "Grandmaster"; color = "#ff0000"; }
  else if (rating >= 2100) { rank = "Master"; color = "#ff8c00"; }
  else if (rating >= 1900) { rank = "Candidate Master"; color = "#aa00aa"; }
  else if (rating >= 1600) { rank = "Expert"; color = "#0000ff"; }
  else if (rating >= 1400) { rank = "Specialist"; color = "#03a89e"; }
  else if (rating >= 1200) { rank = "Pupil"; color = "#008000"; }

  const totalSolved = 60 + (absHash % 400);
  const easySolved = Math.round(totalSolved * 0.5);
  const mediumSolved = Math.round(totalSolved * 0.35);
  const hardSolved = totalSolved - easySolved - mediumSolved;

  const now = new Date();

  // Codeforces problem tags
  const skills = {
    "Algorithms": Math.round(totalSolved * 0.7),
    "Dynamic Programming": Math.round(totalSolved * 0.2),
    "Graphs": Math.round(totalSolved * 0.15),
    "Trees": Math.round(totalSolved * 0.12),
    "Math": Math.round(totalSolved * 0.3),
    "Strings": Math.round(totalSolved * 0.22),
    "Greedy": Math.round(totalSolved * 0.25),
    "Binary Search": Math.round(totalSolved * 0.18),
    "Arrays": Math.round(totalSolved * 0.4),
    "Backtracking": Math.round(totalSolved * 0.08),
    "Segment Tree": absHash % 15,
    "Geometry": absHash % 10
  };

  const heatmap = {};
  for (let i = 0; i < 365; i++) {
    const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = targetDate.toISOString().split("T")[0];
    if ((absHash + i) % 7 < 3) {
      heatmap[dateStr] = 1 + (absHash + i) % 4;
    } else {
      heatmap[dateStr] = 0;
    }
  }

  const problemNames = [
    "Watermelon", "Way Too Long Words", "Theatre Square", "Team", "Next Round",
    "Bit++", "Domino piling", "Beautiful Matrix", "Petya and Strings", "Helpful Maths",
    "Word Capitalization", "Stones on the Table", "Boy or Girl", "Queue at the School",
    "Wrong Subtraction", "Soldier and Bananas", "Elephant", "Translation", "Football"
  ];

  const recentSubmissions = [];
  for (let i = 0; i < 12; i++) {
    const probIdx = (absHash + i * 5) % problemNames.length;
    const isAccepted = (absHash + i) % 5 !== 0;
    const minsAgo = 45 + i * 150 + (absHash % 100);
    const subTime = new Date(now.getTime() - minsAgo * 60 * 1000);

    recentSubmissions.push({
      problem: problemNames[probIdx],
      difficulty: 800 + ((absHash + i) % 15) * 100 + "",
      language: "C++20",
      status: isAccepted ? "Accepted" : "Wrong Answer on test " + (1 + (absHash % 15)),
      runtime: `${30 + (absHash % 120)}ms`,
      memory: `${1024 + (absHash % 4096)} KB`,
      date: subTime.toISOString()
    });
  }

  const contestHistory = [];
  const totalContests = 3 + (absHash % 15);
  let currentRating = 1000;
  for (let i = 1; i <= totalContests; i++) {
    const change = -50 + ((absHash + i * 9) % 180);
    currentRating += change;
    const contestDate = new Date(now.getTime() - (totalContests - i) * 14 * 24 * 60 * 60 * 1000);
    contestHistory.push({
      contestName: `Codeforces Round #${700 + i} (Div. 2)`,
      rating: Math.round(currentRating),
      rank: 200 + (absHash % 4000),
      problemsSolved: 1 + (absHash % 4),
      date: contestDate.toISOString().split("T")[0],
      ratingChange: change >= 0 ? `+${change}` : `${change}`
    });
  }
  contestHistory.reverse();

  const badges = [
    { name: "Pupil Achievement", earned: rating >= 1200, icon: "🟢", platform: "Codeforces" },
    { name: "Specialist Badge", earned: rating >= 1400, icon: "🔵", platform: "Codeforces" },
    { name: "Expert Badge", earned: rating >= 1600, icon: "🟣", platform: "Codeforces" },
    { name: "Candidate Master Badge", earned: rating >= 1900, icon: "👑", platform: "Codeforces" }
  ];

  return {
    username,
    name: username.charAt(0).toUpperCase() + username.slice(1),
    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
    country: ["Russia", "China", "India", "Bangladesh", "Poland", "Ukraine"][(absHash % 6)],
    currentRank: rank,
    contestRating: rating,
    highestRating: highestRating,
    verificationStatus: "Verified",
    lastUpdated: new Date().toISOString(),
    solvedStats: {
      total: totalSolved,
      easy: easySolved,
      medium: mediumSolved,
      hard: hardSolved,
      easyTotal: 1500,
      mediumTotal: 2500,
      hardTotal: 1200
    },
    recentSubmissions,
    contestHistory,
    skills,
    heatmap,
    badges,
    joinedDate: "2024-01-15"
  };
}

const fetchUserData = async (username) => {
  try {
    const infoUrl = `https://codeforces.com/api/user.info?handles=${username}`;
    const infoRes = await axios.get(infoUrl, { timeout: 5000 });

    if (infoRes.data && infoRes.data.status === "OK" && infoRes.data.result && infoRes.data.result.length > 0) {
      const cfUser = infoRes.data.result[0];
      const rating = cfUser.rating || 0;
      const maxRating = cfUser.maxRating || 0;
      const rank = cfUser.rank || "Unrated";
      const avatar = cfUser.avatar || cfUser.titlePhoto || "";

      // Fetch Submissions to aggregate solved counts
      const statusUrl = `https://codeforces.com/api/user.status?handle=${username}&from=1&count=1000`;
      let totalSolved = 0, easySolved = 0, mediumSolved = 0, hardSolved = 0;
      const recentSubmissions = [];
      const heatmap = {};
      const skills = {
        "Algorithms": 0, "Dynamic Programming": 0, "Graphs": 0, "Trees": 0,
        "Math": 0, "Strings": 0, "Greedy": 0, "Binary Search": 0,
        "Arrays": 0, "Backtracking": 0, "Segment Tree": 0, "Geometry": 0
      };

      try {
        const statusRes = await axios.get(statusUrl, { timeout: 5000 });
        if (statusRes.data && statusRes.data.status === "OK") {
          const subs = statusRes.data.result || [];
          const solvedSet = new Set();
          
          subs.forEach((sub, idx) => {
            const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
            const isOK = sub.verdict === "OK";
            const dateStr = new Date(sub.creationTimeSeconds * 1000).toISOString().split("T")[0];

            // Heatmap
            heatmap[dateStr] = (heatmap[dateStr] || 0) + 1;

            if (isOK && !solvedSet.has(problemId)) {
              solvedSet.add(problemId);
              totalSolved++;

              // Difficulty categories based on problem rating
              const pr = sub.problem.rating || 800;
              if (pr < 1300) easySolved++;
              else if (pr < 1900) mediumSolved++;
              else hardSolved++;

              // Skills/tags
              if (sub.problem.tags) {
                sub.problem.tags.forEach(tag => {
                  if (tag.includes("dp")) skills["Dynamic Programming"]++;
                  else if (tag.includes("graph")) skills["Graphs"]++;
                  else if (tag.includes("tree")) skills["Trees"]++;
                  else if (tag.includes("math")) skills["Math"]++;
                  else if (tag.includes("string")) skills["Strings"]++;
                  else if (tag.includes("greedy")) skills["Greedy"]++;
                  else if (tag.includes("binary search")) skills["Binary Search"]++;
                  else if (tag.includes("implementation") || tag.includes("brute force")) skills["Algorithms"]++;
                  else if (tag.includes("data structures")) skills["Arrays"]++;
                  else if (tag.includes("data structures") && pr >= 1800) skills["Segment Tree"]++;
                });
              }
            }

            // Capture first 20 recent submissions
            if (idx < 20) {
              recentSubmissions.push({
                problem: sub.problem.name,
                difficulty: sub.problem.rating ? sub.problem.rating + "" : "Unrated",
                language: sub.programmingLanguage,
                status: sub.verdict === "OK" ? "Accepted" : sub.verdict.replace(/_/g, " "),
                runtime: `${sub.timeConsumedMillis}ms`,
                memory: `${Math.round(sub.memoryConsumedBytes / 1024)} KB`,
                date: new Date(sub.creationTimeSeconds * 1000).toISOString()
              });
            }
          });
        }
      } catch (e) {
        console.error("Codeforces status fetch failed, mapping mock stats:", e.message);
      }

      // Fetch contest history
      const contestHistory = [];
      try {
        const ratingUrl = `https://codeforces.com/api/user.rating?handle=${username}`;
        const ratingRes = await axios.get(ratingUrl, { timeout: 5000 });
        if (ratingRes.data && ratingRes.data.status === "OK") {
          const history = ratingRes.data.result || [];
          history.reverse().forEach(h => {
            const change = h.newRating - h.oldRating;
            contestHistory.push({
              contestName: h.contestName,
              rating: h.newRating,
              rank: h.rank,
              problemsSolved: 1 + (Math.abs(change) % 4), // estimation
              date: new Date(h.ratingUpdateTimeSeconds * 1000).toISOString().split("T")[0],
              ratingChange: change >= 0 ? `+${change}` : `${change}`
            });
          });
        }
      } catch (e) {
        console.error("Codeforces rating history fetch failed:", e.message);
      }

      // Build default empty heatmap if none
      if (Object.keys(heatmap).length === 0) {
        const now = new Date();
        for (let i = 0; i < 365; i++) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = d.toISOString().split("T")[0];
          heatmap[dateStr] = 0;
        }
      }

      return {
        username,
        name: cfUser.firstName ? `${cfUser.firstName} ${cfUser.lastName || ""}`.trim() : username,
        avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${username}-cf`,
        country: cfUser.country || "N/A",
        currentRank: rank || "Newbie",
        contestRating: rating || 0,
        highestRating: maxRating || rating || 0,
        verificationStatus: "Verified",
        lastUpdated: new Date().toISOString(),
        solvedStats: {
          total: totalSolved,
          easy: easySolved,
          medium: mediumSolved,
          hard: hardSolved,
          easyTotal: 1500,
          mediumTotal: 2500,
          hardTotal: 1200
        },
        recentSubmissions,
        contestHistory,
        skills: totalSolved > 0 ? skills : { "Algorithms": 0 },
        heatmap,
        badges: [
          { name: "Pupil Achievement", earned: rating >= 1200, icon: "🟢", platform: "Codeforces" },
          { name: "Specialist Badge", earned: rating >= 1400, icon: "🔵", platform: "Codeforces" },
          { name: "Expert Badge", earned: rating >= 1600, icon: "🟣", platform: "Codeforces" },
          { name: "Candidate Master Badge", earned: rating >= 1900, icon: "👑", platform: "Codeforces" }
        ],
        joinedDate: "2023-01-01"
      };
    } else {
      throw new Error(`Username '${username}' not found on Codeforces.`);
    }
  } catch (error) {
    if (error.response && error.response.data && error.response.data.comment && error.response.data.comment.toLowerCase().includes("not found")) {
      throw new Error(`Username '${username}' not found on Codeforces.`);
    }
    throw new Error(`Failed to query Codeforces profile: ${error.message}`);
  }
};

module.exports = {
  fetchUserData
};
