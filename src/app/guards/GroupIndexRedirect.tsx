import { Navigate, useParams } from 'react-router';

/** /turmas/:groupId → aba Jogadores (cada aba é uma sub-rota). */
export function GroupIndexRedirect() {
  const { groupId = '' } = useParams();
  return <Navigate to={`/turmas/${groupId}/jogadores`} replace />;
}
