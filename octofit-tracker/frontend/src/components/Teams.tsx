import { useApiResource } from '../api/useApiResource.js';

type Team = {
  _id?: string;
  name: string;
  mascot?: string;
  members: Array<string | { _id: string; name?: string }>;
};

export default function Teams() {
  const { data, loading, error } = useApiResource<{ teams: Team[] }>('/api/teams');
  const teams = data?.teams ?? [];

  return (
    <section className="card">
      <div className="card-body">
        <h2 className="h4">Teams</h2>
        <p>Manage teams and members.</p>
        {loading && <p role="status">Loading teams...</p>}
        {error && <p role="alert">Unable to load teams: {error}</p>}
        {!loading && !error && teams.length === 0 && <p>No teams yet.</p>}
        {!loading && !error && teams.length > 0 && (
          <ul className="list-group">
            {teams.map((team, index) => (
              <li className="list-group-item" key={team._id ?? `${team.name}-${index}`}>
                <h3 className="h5">{team.name}</h3>
                {team.mascot && <p>Mascot: {team.mascot}</p>}
                {team.members.length > 0
                  ? <p>Members: {team.members.map((member) => typeof member === 'string' ? member : member.name ?? member._id).join(', ')}</p>
                  : <p>No members yet.</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
