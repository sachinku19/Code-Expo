const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Post = require("../models/Post");

const seedTechNews = async () => {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Database connected successfully.");

    // 1. Create or find the demo20 user (author of the news posts)
    let demoUser = await User.findOne({ username: "demo20" });
    if (!demoUser) {
      console.log("User 'demo20' not found. Creating a new demo account...");
      const hashedPassword = await bcrypt.hash("demo20password", 10);
      demoUser = await User.create({
        username: "demo20",
        email: "demo20@codeexpo.com",
        password: hashedPassword,
        avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60",
        role: "user",
        title: "Tech News Analyst 🚀",
        developerLevel: 5,
        reputationScore: 2500,
        subscription: {
          plan: "Developer Pro",
          status: "active",
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
      console.log(`✅ User 'demo20' created with ID: ${demoUser._id}`);
    } else {
      console.log(`✅ User 'demo20' already exists with ID: ${demoUser._id}`);
    }

    // 2. Create helper mock users for adding realistic comments
    const commenterUsernames = ["dev_sachin", "tech_wizard", "frontend_guru", "ai_researcher"];
    const commenters = [];
    for (const name of commenterUsernames) {
      let u = await User.findOne({ username: name });
      if (!u) {
        const hPass = await bcrypt.hash("commenter123", 10);
        u = await User.create({
          username: name,
          email: `${name}@codeexpo.com`,
          password: hPass,
          avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=60`,
          title: "Developer Community Member",
          developerLevel: 3
        });
      }
      commenters.push(u);
    }
    console.log(`✅ Verified ${commenters.length} helper commenting users.`);

    // 3. Clear existing posts by demo20 to avoid duplicate seeding
    const deleteResult = await Post.deleteMany({ author: demoUser._id });
    console.log(`🧹 Cleared ${deleteResult.deletedCount} existing posts from 'demo20'.`);

    // 4. Define 20 high-quality tech news posts
    const newsData = [
      {
        text: `### React 19 is Officially Here! ⚛️

React 19 has officially launched, bringing major changes to how we handle state, asynchronous operations, and document metadata. Here are the core highlights:

1. **Actions**: Say goodbye to manual pending states. React 19 introduces a native way to handle async operations in transitions:
\`\`\`javascript
const [isPending, startTransition] = useTransition();
const handleSubmit = () => {
  startTransition(async () => {
    await updateProfile(name);
  });
};
\`\`\`

2. **useActionState**: A new hook that automates managing async forms and displaying status updates.
3. **Document Metadata Support**: You can now declare \`<title>\`, \`<meta>\`, and \`<link>\` tags directly inside your components. React will automatically hoist them to the HTML header!

Are you planning to upgrade your production codebases soon? Let's discuss in the comments!`,
        techStack: ["React", "JavaScript", "Frontend", "WebDev"],
        image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[2]._id, text: "The native document metadata hoisting is a game changer for SEO!" },
          { user: commenters[0]._id, text: "Can't wait to replace all my custom useSubmit hooks with native Actions." }
        ]
      },
      {
        text: `### OpenAI Unveils Next-Gen Reasoning Model: GPT-5 🌌

OpenAI has announced the preview of its next-generation LLM code-named **GPT-5**. Unlike current models that output text token-by-token immediately, GPT-5 uses an advanced chain-of-thought architecture to plan, search, and reason before responding.

**Key Achievements:**
- **Advanced Code Synthesis**: Generates complex multi-file codebase integrations with minimal bugs.
- **Scientific Logic**: Solves undergraduate-level math and physics questions with over 90% accuracy.
- **Autonomous Agent capabilities**: Capable of executing system commands in sandboxed environments to test and iterate on its own code.

This marks a giant leap from autocomplete AI towards autonomous agentic assistants.`,
        techStack: ["AI", "LLM", "GPT-5", "OpenAI", "MachineLearning"],
        image: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[3]._id, text: "The reasoning latency is high, but the accuracy makes it completely worth it." },
          { user: commenters[1]._id, text: "Agentic tool calling loops are going to dominate software development." }
        ]
      },
      {
        text: `### Node.js 22 Promoted to LTS! 🚀

Node.js 22 has been officially promoted to Long Term Support (LTS). This release focuses on developer experience, performance, and ESM (ES Module) standard alignment.

**What's New?**
- **Native ESM Detection**: Node will now automatically detect and load ES Modules under more flexible circumstances without requiring \`package.json\` modifications.
- **Built-in WebSocket Client**: No need to install third-party libraries for simple socket clients anymore!
- **V8 Engine v12.4**: Substantial performance optimizations in garbage collection and array processing.
- **Native --watch flag**: Hot reload files during development natively:
\`\`\`bash
node --watch server.js
\`\`\`

Time to migrate from Node 18/20!`,
        techStack: ["Node.js", "Backend", "ESM", "JavaScript"],
        image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[0]._id, text: "The native watch flag is so convenient. Goodbye nodemon configuration!" }
        ]
      },
      {
        text: `### Rust in the Linux Kernel: The First Stable Drivers 🦀

After years of planning, Rust helper scripts and abstractions are officially producing stable device drivers in the Linux kernel core. The latest Linux kernel patch includes rewritten ethernet and GPU drivers written entirely in safe Rust.

**Why Rust?**
- **Memory Safety**: Prevents null pointer dereferences and use-after-free bugs that compromise kernel security.
- **Concurrent Programming**: Compile-time checks ensure data races are caught before drivers compile.

While C remains the foundation, Rust is now a first-class language in kernel space.`,
        techStack: ["Rust", "Linux", "Systems", "Security"],
        image: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[1]._id, text: "Safe drivers mean fewer blue screens and kernel panics. Huge win!" }
        ]
      },
      {
        text: `### Tailwind CSS v4.0 Alpha: Built in Rust 🎨

Tailwind CSS v4.0 is currently in alpha, featuring a complete rewrite in Rust. The new engine compiles stylesheets up to **10x faster** than the current PostCSS engine.

**Key Changes:**
- **CSS-First Configuration**: Instead of a bloated \`tailwind.config.js\`, configure your design system directly inside CSS using native CSS variables:
\`\`\`css
@theme {
  --color-primary: #aa3bff;
  --font-display: "Outfit", sans-serif;
}
\`\`\`
- **Zero Configuration**: Out-of-the-box support for nested CSS, vendor prefixing, and automated font loading.

This is a massive step forward for compiler speed and configuration simplicity.`,
        techStack: ["TailwindCSS", "CSS", "Rust", "Frontend"],
        image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[2]._id, text: "CSS-first config is a breath of fresh air. It feels like writing vanilla CSS again." }
        ]
      },
      {
        text: `### WebAssembly (Wasm) vs. Docker: The New Edge Standard 🌐

Is WebAssembly the future of cloud computing? More organizations are adopting WebAssembly Micro Runtimes (WAMR) to deploy edge scripts.

**Wasm vs Docker benefits:**
1. **Cold Start Times**: Wasm binaries start in microseconds (vs. seconds for Docker containers).
2. **Binary Sizes**: Wasm files are typically a few hundred kilobytes, compared to megabytes or gigabytes for Docker layers.
3. **Isolated Sandbox**: Wasm executes instructions securely with strict access control by default.

Solomon Hykes, co-creator of Docker, famously said: *"If Wasm + WASI existed in 2008, we wouldn't have needed to create Docker."*`,
        techStack: ["WebAssembly", "Docker", "DevOps", "EdgeComputing"],
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[3]._id, text: "Wasm on the Edge is perfect. Running fast logic next to the user is super clean." }
        ]
      },
      {
        text: `### Apple M4 Chipset: local AI at 38 Trillion Operations/Second 💻

Apple has launched its latest M4 chipset, packing a highly optimized Neural Engine designed specifically for running LLMs locally.

**Specifications & Capability:**
- **NPUs**: Performs up to 38 TOPS (Trillion Operations Per Second).
- **Unified Memory**: Bandwidth boosted to 150GB/s, allowing local execution of 8B and 14B parameter models with sub-second token latency.
- **Hardware-Accelerated Ray Tracing**: A major leap for graphic renderers on portable laptops.

Having local AI means developers can build offline agents with absolute data privacy.`,
        techStack: ["Apple", "M4", "Hardware", "AI", "AppleSilicon"],
        image: "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[1]._id, text: "Offline LLM execution is the future. No API bills, no latency!" }
        ]
      },
      {
        text: `### GitHub Copilot Workspace: AI-Native Repositories 🛠️

GitHub has launched Copilot Workspace, moving beyond simple autocomplete popups. Workspace provides a full dashboard to plan, build, and debug pull requests in natural language.

**Workflow:**
1. **Task Description**: Define what issue you want solved (e.g. "Add validation to checkout schema").
2. **Implementation Plan**: The AI drafts a step-by-step code change plan across files.
3. **Execution**: The AI writes the code, launches test scripts, resolves linter errors, and submits the PR.

This transforms developer workflows from writing boilerplate to reviewing and editing plans.`,
        techStack: ["AI", "GitHub", "Copilot", "SoftwareEngineering"],
        image: "https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[0]._id, text: "It's like having an apprentice developer write all the tests and minor fixes." }
        ]
      },
      {
        text: `### Physical Qubit Error Correction Milestone achieved 🌌

Quantum computing researchers have achieved a breakthrough by demonstrating a physical system where error correction improves as logical qubit sizes scale up.

**Why this matters:**
Historically, adding more physical qubits introduced noise and elevated error rates. Under the new topological surface code architecture, researchers successfully corrected logical errors by spreading information across hundreds of entangled physical qubits.

This brings us a step closer to fault-tolerant quantum computing capable of solving cryptography and chemical simulation tasks.`,
        techStack: ["QuantumComputing", "Physics", "Science", "FutureTech"],
        image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[3]._id, text: "Error correction was the main bottleneck. Solving this opens up cryptographic timelines!" }
        ]
      },
      {
        text: `### Bun v1.2 Released: Is it Node.js's true successor? 🚀

Bun has released version 1.2, introducing built-in testing frameworks, SQLite database compatibility, and native lockfiles.

**Performance benchmarks:**
- **HTTP Server**: Handles 2x more requests per second than Node.js.
- **npm Install**: Executes up to 20x faster using a globally shared cache.
- **Hot Reloading**: Instantly restarts servers in milliseconds.

Bun's compatibility with native Node APIs is now close to 99%, making transitions easier than ever.`,
        techStack: ["Bun", "Node.js", "JavaScript", "Frontend"],
        image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[2]._id, text: "I migrated my script server to Bun and dev startup times are incredibly fast." }
        ]
      },
      {
        text: `### System Design 101: Scaling to 10 Million Active Users ⚙️

How do big platforms scale to support massive concurrent user traffic? Here is the standard architecture breakdown:

1. **DNS & CDN**: Serve static assets close to users via Cloudflare/AWS CloudFront.
2. **Load Balancer (Nginx/HAProxy)**: Distribute API traffic across an auto-scaling group of stateless application nodes.
3. **Database Sharding**: Split massive database files across servers based on user IDs.
4. **Redis Cache**: Store heavy database query results in-memory to prevent database CPU spikes.
5. **Message Queues (Kafka/RabbitMQ)**: Process heavy background jobs (like video encoding or notification alerts) asynchronously.

\`\`\`
[User] -> [CDN] -> [Load Balancer] -> [App Cluster] -> [Redis Cache] -> [Database]
\`\`\`

Scale is about removing bottlenecks, not just buying bigger servers!`,
        techStack: ["SystemDesign", "SoftwareArchitecture", "Databases", "Cloud"],
        image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[1]._id, text: "Stateless API design is crucial. It makes auto-scaling completely trivial." }
        ]
      },
      {
        text: `### Next.js 15: Caching Defaults & Performance Tuning 🌐

Next.js 15 has introduced major changes to its caching strategies, addressing one of the community's biggest complaints: over-caching.

**Key Upgrades:**
- **Dynamic fetch by Default**: Next.js 15 fetch requests are now uncached by default, preventing unexpected stale data in production.
- **Server Action Safety**: Improved cryptographic signatures for form submission endpoints.
- **Partial Prerendering (PPR)**: Render static shell elements instantly while streaming in dynamic database segments dynamically.

These updates improve the developer experience and make caching behaviors explicit.`,
        techStack: ["Next.js", "React", "Frontend", "JavaScript"],
        image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[2]._id, text: "Dynamic fetch by default makes sense. Uncached is a much safer default!" }
        ]
      },
      {
        text: `### WebGPU Lands in Stable Chrome: Desktop Power in Browser 🎮

WebGPU is officially available in Chrome, giving web applications direct, low-overhead access to local GPU hardware.

**What changes?**
Unlike WebGL, which was designed for 2D/3D canvas rendering, WebGPU supports advanced compute shaders. This allows complex machine learning models (like Whisper or Stable Diffusion) to run directly inside web pages using local graphics hardware.

This is a massive leap for browser-based gaming and client-side generative AI.`,
        techStack: ["WebGPU", "Chrome", "WebGL", "Graphics", "HTML5"],
        image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[3]._id, text: "WebGPU is incredibly fast. Local ML models run at near native speeds!" }
        ]
      },
      {
        text: `### CSS Anchor Positioning: The Popper.js Killer ⚓

Creating tooltips, popovers, and dropdowns has always required heavy JavaScript positioning libraries (like Floating UI or Popper). CSS Anchor Positioning changes this.

**Usage Example:**
\`\`\`css
/* Define target anchor */
.anchor-btn {
  anchor-name: --my-anchor;
}

/* Position popover relative to anchor */
.tooltip {
  position: absolute;
  position-anchor: --my-anchor;
  top: anchor(bottom);
  left: anchor(center);
}
\`\`\`

The browser handles layout calculations natively, preventing layout shifts and lag.`,
        techStack: ["CSS", "HTML", "Frontend", "WebDesign"],
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[0]._id, text: "This will save thousands of lines of JS code in UI components. Native anchoring is excellent." }
        ]
      },
      {
        text: `### PostgreSQL vs. MongoDB in 2026: The Gap is Closing 🗄️

The debate between relational and document databases has changed, as PostgreSQL has optimized its native JSONB capabilities.

**Postgres JSONB advantages:**
- **ACID Transactions**: Perform transactional operations across complex JSON document structures.
- **Indexing**: GIN indexes allow fast querying of nested JSON attributes.
- **Hybrid Models**: Join tabular relational data directly with dynamic document columns in a single query.

While MongoDB remains excellent for horizontal write scaling, Postgres has become the default database for general development.`,
        techStack: ["PostgreSQL", "MongoDB", "Databases", "Backend"],
        image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[1]._id, text: "PostgreSQL JSONB is so good, it covers 95% of use cases where I used to use MongoDB." }
        ]
      },
      {
        text: `### How AI Agents Think: The ReAct (Reason + Action) Loop 🤖

AI Agents differ from simple chat inputs by executing loops of reasoning and tool calling. The most common pattern is **ReAct**.

**The ReAct Loop:**
1. **Thought**: The AI analyzes the task (e.g. "Check site health").
2. **Action**: The AI calls a tool (e.g. \`fetch("https://status.site.com")\`).
3. **Observation**: The AI receives tool output (e.g. \`{ status: 500 }\`).
4. **Thought**: The AI process results (e.g. "The server returned 500 error. I should alert the admin").
5. **Action**: The AI calls a tool (e.g. \`sendEmail("Admin", "Server down!")\`).

Building stable agent architectures requires robust state machines and retry parameters.`,
        techStack: ["AI", "AIAgents", "ReAct", "SoftwareEngineering"],
        image: "https://images.unsplash.com/photo-1617791160505-6f006e121980?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[3]._id, text: "Handling edge cases like infinite loops in tool calling is the main engineering challenge." }
        ]
      },
      {
        text: `### TypeScript 5.x: Speed, Decorators, and Narrowing 🛠️

TypeScript 5 has brought substantial improvements to compiler performance and type safety.

**Key Additions:**
- **Native ECMAScript Decorators**: Fully aligned with the latest JS decorator specification.
- **Smarter Type Narrowing**: Better detection of type changes in loops and arrays.
- **Performance**: Up to 20% faster build speeds and smaller installation size by rearranging internal code objects.

Keep your TS versions updated to ensure the best DX in editors!`,
        techStack: ["TypeScript", "JavaScript", "SoftwareEngineering"],
        image: "https://images.unsplash.com/photo-1516116211223-5c359a36298a?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[2]._id, text: "Build speedups are very noticeable on large projects. TS compiler is super optimized now." }
        ]
      },
      {
        text: `### Deno 2.0 Launches: Unified JS Runtime 🦕

Deno 2.0 has officially launched, aiming to unify runtime fragmentation. Unlike earlier versions that rejected Node standards, Deno 2.0 is fully backward-compatible.

**Key Features:**
- **Seamless npm compatibility**: Import npm packages natively with zero installation steps.
- **Built-in Package Manager**: Standardize lockfiles, testing, formatting, and linting under one CLI.
- **Workspace Monorepos**: Native support for managing multi-package codebases.

Deno is no longer an alternative environment; it is a direct drop-in replacement for Node.`,
        techStack: ["Deno", "Node.js", "JavaScript", "Backend"],
        image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[0]._id, text: "Having built-in test runners and formatters in a single binary is amazing." }
        ]
      },
      {
        text: `### Micro-Frontends: Scalability or Over-Engineering? 🧩

Micro-frontends allow large teams to divide massive frontends into isolated, deployable micro-applications.

**Pros:**
- **Deployment Autonomy**: Teams deploy updates without waiting for parent build cycles.
- **Tech Stack Flexibility**: Run React and Vue modules side-by-side.

**Cons:**
- **Performance Overhead**: Users download duplicate vendor files.
- **Complex Orchestration**: Testing and routing across apps becomes difficult.

*Conclusion:* Use micro-frontends only when scaling across 50+ developers. For smaller teams, a structured monorepo is much safer.`,
        techStack: ["MicroFrontends", "WebArchitecture", "Vite", "Webpack"],
        image: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[2]._id, text: "Micro-frontends are 90% organizational scaling, 10% technical architecture." }
        ]
      },
      {
        text: `### Passkeys: The End of Master Passwords 🔑

Passkeys are gaining massive adoption across major platforms, replacing traditional email/password forms.

**How Passkeys work:**
Passkeys use public-key cryptography. During registration, your device generates a public-private key pair. The website stores the public key, while your private key stays secure in your device's enclave, unlocked only via biometric authentication (FaceID/Fingerprint).

Passkeys are completely immune to phishing attacks since there is no password to leak or steal.`,
        techStack: ["Security", "Passkeys", "Cryptography", "Auth"],
        image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80",
        comments: [
          { user: commenters[1]._id, text: "It's so convenient. Logging in with FaceID is much faster than typing long passwords." }
        ]
      }
    ];

    // 5. Build and insert the post objects
    const postObjects = newsData.map((data, index) => {
      // Offset timestamps so they appear spread out chronologically
      const createdAt = new Date(Date.now() - index * 3 * 3600 * 1000); // every 3 hours

      const mappedComments = data.comments.map(c => {
        const commenterUser = commenters.find(u => u._id.toString() === c.user.toString());
        return {
          user: c.user,
          username: commenterUser ? commenterUser.username : "anonymous",
          avatar: commenterUser ? commenterUser.avatar : "",
          text: c.text,
          createdAt: new Date(createdAt.getTime() + 10 * 60 * 1000)
        };
      });

      return {
        author: demoUser._id,
        text: data.text,
        techStack: data.techStack,
        image: data.image,
        images: [data.image],
        comments: mappedComments,
        status: "active",
        createdAt,
        updatedAt: createdAt
      };
    });

    const inserted = await Post.insertMany(postObjects);
    console.log(`✅ Successfully seeded ${inserted.length} high-quality tech news posts into the feed!`);

  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected.");
  }
};

seedTechNews();
