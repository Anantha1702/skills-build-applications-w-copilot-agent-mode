import { useApiResource } from '../api/useApiResource.js';

type Activity = {
  _id?: string;
  type: string;
  minutes: number;
  points: number;
  occurredAt?: string;
};

export default function Activities() {
  const { data, loading, error } = useApiResource<{ activities: Activity[] }>('/api/activities');
  const activities = data?.activities ?? [];

  return (
    <section className="card">
      <div className="card-body">
        <h2 className="h4">Activities</h2>
        <p>Track student activity minutes and points.</p>
        {loading && <p role="status">Loading activities...</p>}
        {error && <p role="alert">Unable to load activities: {error}</p>}
        {!loading && !error && activities.length === 0 && <p>No activities yet.</p>}
        {!loading && !error && activities.length > 0 && (
          <ul className="list-group">
            {activities.map((activity, index) => (
              <li className="list-group-item" key={activity._id ?? `${activity.type}-${index}`}>
                <strong>{activity.type}</strong>: {activity.minutes} minutes, {activity.points} points
                {activity.occurredAt && <span> ({new Date(activity.occurredAt).toLocaleDateString()})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
