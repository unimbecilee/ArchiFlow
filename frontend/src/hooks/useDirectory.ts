import { useQuery } from 'react-query';
import { getUsersForApproval } from '../services/usersService';
import { getOrganizations } from '../services/organizationsService';
import { getSharingRoles } from '../services/rolesService';

export function useUsersForApproval() {
  return useQuery(['users-for-approval'], getUsersForApproval);
}

export function useOrganizations() {
  return useQuery(['organizations'], getOrganizations);
}

export function useSharingRoles() {
  return useQuery(['sharing-roles'], getSharingRoles);
}
