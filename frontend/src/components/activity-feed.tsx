import { Activity } from "@/lib/types";
import { formatStars } from "@/lib/format";
import { Link } from "react-router-dom";
import { CalendarIcon, StarIcon } from "@/components/icons";

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return <p className="muted">No activity yet. Start following people or log your own reads!</p>;
  }

  return (
    <div className="activity-stack">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

function ActivityHeader({ activity }: { activity: Activity }) {
  const actionLabels: Record<string, string> = {
    log: " logged ",
    review: " reviewed ",
    follow: " followed ",
    shelf: " added ",
  };

  return (
    <div className="activity-content">
      <Link to={`/profile/${activity.user_name}`} className="activity-user-link">
        {activity.display_name || activity.user_name}
      </Link>
      
      <span className="activity-action">
        {actionLabels[activity.activity_type] || " "}
      </span>

      {activity.book_title && (
        <Link to={`/books/${activity.book_slug}`} className="activity-target-link">
          {activity.book_title}
        </Link>
      )}

      {activity.activity_type === "follow" && activity.target_user_name && (
        <Link to={`/profile/${activity.target_user_name}`} className="activity-target-link">
          {activity.target_user_name}
        </Link>
      )}

      {activity.activity_type === "shelf" && activity.data.list_name && (
        <span className="activity-target-link">{activity.data.list_name}</span>
      )}
    </div>
  );
}

function ActivityDetails({ activity }: { activity: Activity }) {
  if (activity.activity_type === "log") {
    return (
      <div className="activity-meta">
        {activity.data.rating && (
          <span className="stars">{formatStars(Number(activity.data.rating))}</span>
        )}
        {activity.data.is_reread && <span className="chip">Reread</span>}
      </div>
    );
  }

  if (activity.activity_type === "review") {
    return (
      <div className="activity-snippet">
        {activity.data.rating && (
          <div className="stars-row">{formatStars(Number(activity.data.rating))}</div>
        )}
        <p>{activity.data.review_snippet}</p>
      </div>
    );
  }

  return null;
}

function ActivityItem({ activity }: { activity: Activity }) {
  const dateStr = new Date(activity.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <article className="activity-item">
      <div className="activity-user-avatar">
        {activity.avatar_url ? (
          <img src={activity.avatar_url} alt={activity.user_name} />
        ) : (
          <div className="avatar-placeholder">{activity.user_name[0].toUpperCase()}</div>
        )}
      </div>

      <div className="activity-body">
        <ActivityHeader activity={activity} />
        <ActivityDetails activity={activity} />
      </div>

      <div className="activity-date">
        {dateStr}
      </div>
    </article>
  );
}
