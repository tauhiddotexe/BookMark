import { Review } from "@/lib/types";

export function ProfileStats({ reviews }: { reviews: Review[] }) {
  const distribution = [0, 0, 0, 0, 0]; // 1 to 5 stars
  reviews.forEach((r) => {
    const rating = Math.round(Number(r.rating));
    if (rating >= 1 && rating <= 5) {
      distribution[rating - 1]++;
    }
  });

  const max = Math.max(...distribution, 1);

  return (
    <div className="card profile-stats-visual">
      <div className="section-head">
        <h2>Ratings Distribution</h2>
      </div>
      <div className="dist-chart">
        {distribution.map((count, i) => (
          <div key={i} className="dist-bar-wrapper">
            <div 
              className="dist-bar" 
              style={{ height: `${(count / max) * 100}%` }}
              title={`${i + 1} stars: ${count} reviews`}
            >
              <span className="dist-count">{count > 0 ? count : ""}</span>
            </div>
            <span className="dist-label">{i + 1}★</span>
          </div>
        ))}
      </div>
    </div>
  );
}
