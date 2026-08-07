import React from "react";
import StoriesSystem from "../../StoriesSystem";

export const StoriesColumn = ({ user, addToast, onUserClick }) => {
  return (
    <aside className="rebuilt-left-column">
      <StoriesSystem user={user} addToast={addToast} vertical={true} onUserClick={onUserClick} />
    </aside>
  );
};

export default React.memo(StoriesColumn);
