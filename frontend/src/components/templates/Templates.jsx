import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Code2, Globe, Layers, Trophy, Workflow, Check, Loader2 } from "lucide-react";
import "./Templates.css";

function Templates() {
  const [loadingTemplate, setLoadingTemplate] = useState(null);
  const [successTemplate, setSuccessTemplate] = useState(null);

  const templates = [
    {
      id: "react",
      icon: Code2,
      title: "React Starter",
      desc: "Ready-to-use React workspace with hot-reloading active.",
      tag: "Single-page App",
      color: "#61dafb"
    },
    {
      id: "mern",
      icon: Layers,
      title: "MERN Stack",
      desc: "Pre-configured frontend + backend client server pipeline.",
      tag: "Full Stack",
      color: "#a855f7"
    },
    {
      id: "dsa",
      icon: Workflow,
      title: "DSA Playground",
      desc: "Practice coding algorithms with predefined unit assertions.",
      tag: "Competitive",
      color: "#06b6d4"
    },
    {
      id: "hackathon",
      icon: Trophy,
      title: "Hackathon Kit",
      desc: "Accelerate development using tailwind setups and simple schemas.",
      tag: "Speed Build",
      color: "#f43f5e"
    },
    {
      id: "ai",
      icon: BrainCircuit,
      title: "AI SaaS Framework",
      desc: "AI startup boilerplate equipped with endpoints integrations.",
      tag: "Next-Gen",
      color: "#10b981"
    },
    {
      id: "nextjs",
      icon: Globe,
      title: "Next.js App Router",
      desc: "Next.js folder boilerplates with optimized SSR capabilities.",
      tag: "Production",
      color: "#ffffff"
    },
  ];

  const handleUseTemplate = (id) => {
    if (loadingTemplate || successTemplate) return;
    setLoadingTemplate(id);
    
    // Simulate container deployment
    setTimeout(() => {
      setLoadingTemplate(null);
      setSuccessTemplate(id);
      
      setTimeout(() => {
        setSuccessTemplate(null);
      }, 2000);
    }, 1500);
  };

  return (
    <section className="templates">
      <div className="templates-header">
        <h2>Start Instantly with Templates</h2>
        <p>Accelerate your project setup with containerised boilerplates in one click.</p>
      </div>

      <div className="templates-grid">
        {templates.map((template, index) => {
          const Icon = template.icon;
          const isThisLoading = loadingTemplate === template.id;
          const isThisSuccess = successTemplate === template.id;

          return (
            <motion.div
              key={template.title}
              className="template-card"
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              whileHover={{ y: -8, scale: 1.01 }}
            >
              <div className="template-card-header">
                <div className="template-icon" style={{ borderColor: `${template.color}25` }}>
                  <Icon size={22} style={{ color: template.color }} />
                </div>
                <span className="template-tag">{template.tag}</span>
              </div>

              <h3>{template.title}</h3>
              <p>{template.desc}</p>

              <button 
                className={`template-action-btn ${isThisLoading ? "loading" : ""} ${isThisSuccess ? "success" : ""}`}
                onClick={() => handleUseTemplate(template.id)}
                disabled={isThisLoading || isThisSuccess}
              >
                {isThisLoading ? (
                  <>
                    <Loader2 size={15} className="spinner-icon" />
                    <span>Setting up environment...</span>
                  </>
                ) : isThisSuccess ? (
                  <>
                    <Check size={15} />
                    <span>Workspace Ready!</span>
                  </>
                ) : (
                  <>
                    <span>Use Template</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export default Templates;
