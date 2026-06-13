import {motion} from "framer-motion"

const Card=({title,value,icon,color})=>{

    return(
        <motion.div
      className="stats-card"
      whileHover={{
        y: -6,
        scale: 1.02
      }}
    >
      <div
        className="stats-icon"
        style={{
          background: color
        }}
      >
        {icon}
      </div>

      <div className="stats-content">
        <span>{title}</span>
        <h2>{value}</h2>
      </div>
    </motion.div>
    );
}

export default Card;