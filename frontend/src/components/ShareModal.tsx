import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Input,
  Box,
  Text,
  Heading,
  Tag,
  TagLabel,
  TagCloseButton,
  FormControl,
  FormLabel,
  Checkbox,
  CheckboxGroup,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  Spinner,
  IconButton,
  Tooltip,
  List,
  ListItem,
  Divider,
  useToast,
  Select,
  Textarea,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Grid,
  GridItem
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import config from '../config';
import { useUsersForApproval, useOrganizations, useSharingRoles } from '../hooks/useDirectory';
import { useCreateShare, useRevokeShare } from '../hooks/useSharing';

const API_URL = config.API_URL;

// Composant d'icône personnalisé avec emojis
const CustomIcon: React.FC<{ type: string; size?: 'sm' | 'md' | 'lg' }> = ({ type, size = 'sm' }) => {
  let fontSize = '16px';
  if (size === 'md') fontSize = '20px';
  if (size === 'lg') fontSize = '24px';
  
  const iconStyle = {
    fontSize,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
  
  switch (type) {
    case 'utilisateur':
      return <span style={iconStyle}>👤</span>;
    case 'role':
      return <span style={iconStyle}>👥</span>;
    case 'organisation':
      return <span style={iconStyle}>🏢</span>;
    case 'view':
      return <span style={iconStyle}>👁️</span>;
    case 'download':
      return <span style={iconStyle}>⬇️</span>;
    case 'edit':
      return <span style={iconStyle}>✏️</span>;
    case 'comment':
      return <span style={iconStyle}>💬</span>;
    case 'delete':
      return <span style={iconStyle}>🗑️</span>;
    case 'share':
      return <span style={iconStyle}>🔗</span>;
    case 'close':
      return <span style={iconStyle}>✖️</span>;
    default:
      return <span style={iconStyle}>📄</span>;
  }
};

// Types
interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  organisation_id?: number;
}

interface Role {
  nom: string;
  description: string;
}

interface Organization {
  id: number;
  nom: string;
  description: string;
}

interface ShareDestination {
  type: 'utilisateur' | 'role' | 'organisation';
  id: string;
  nom: string;
}

interface ShareData {
  destinataires: ShareDestination[];
  permissions: string[];
  date_expiration?: string;
  commentaire: string;
}

interface ExistingShare {
  id: number;
  document_id: number;
  utilisateur_id?: number;
  role_nom?: string;
  organisation_id?: number;
  permissions: string[];
  date_partage: string;
  date_expiration?: string;
  commentaire: string;
  destinataire_nom: string;
  type_destinataire: 'utilisateur' | 'role' | 'organisation';
  createur_nom: string;
}

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  documentId: number;
  documentTitle: string;
  onShareSuccess?: () => void;
}

const PERMISSIONS_OPTIONS = [
  { key: 'lecture', label: 'Lecture', icon: <CustomIcon type="view" />, description: 'Peut voir le document' },
  { key: 'téléchargement', label: 'Téléchargement', icon: <CustomIcon type="download" />, description: 'Peut télécharger le fichier' },
  { key: 'modification', label: 'Modification', icon: <CustomIcon type="edit" />, description: 'Peut modifier le document' },
  { key: 'commentaire', label: 'Commentaire', icon: <CustomIcon type="comment" />, description: 'Peut laisser des commentaires' },
  { key: 'partage_supplementaire', label: 'Re-partage', icon: <CustomIcon type="share" />, description: 'Peut partager à son tour' }
];

const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onClose,
  documentId,
  documentTitle,
  onShareSuccess
}) => {
  const toast = useToast();
  
  // Couleurs cohérentes avec le thème sombre de l'application
  const bgColor = '#141829';           // Arrière-plan principal
  const cardBg = '#1c2338';            // Arrière-plan des cartes
  const borderColor = '#3a445e';       // Bordures
  const textColor = 'white';           // Texte principal
  const mutedColor = 'gray.400';       // Texte secondaire
  const inputBg = '#2a3657';           // Arrière-plan inputs
  
  // États pour les données
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [existingShares, setExistingShares] = useState<ExistingShare[]>([]);

  // États pour le formulaire
  const [shareData, setShareData] = useState<ShareData>({
    destinataires: [],
    permissions: ['lecture'],
    commentaire: ''
  });
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);

  // États UI
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // États pour les filtres
  const [filterType, setFilterType] = useState<string>('tous');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Hooks pour données répertoire et mutations
  const { data: usersData } = useUsersForApproval();
  const { data: orgsData } = useOrganizations();
  const { data: rolesData } = useSharingRoles();
  const createShareMutation = useCreateShare(documentId);
  const revokeShareMutation = useRevokeShare();

  // Charger les données nécessaires
  useEffect(() => {
    if (open) {
      if (usersData) setUsers(usersData);
      if (orgsData) setOrganizations(orgsData);
      if (rolesData) setRoles(rolesData);
      loadExistingShares();
    }
  }, [open, documentId, usersData, orgsData, rolesData]);

  // Suppression du chargement manuel: hydratation via hooks

  const loadExistingShares = async () => {
    try {
      const response = await fetch(`${API_URL}/api/documents/${documentId}/shares`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExistingShares(data.partages || []);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des partages existants:', err);
    }
  };

  const handleDestinationAdd = (destination: ShareDestination) => {
    if (!shareData.destinataires.find(d => d.type === destination.type && d.id === destination.id)) {
      setShareData(prev => ({
        ...prev,
        destinataires: [...prev.destinataires, destination]
      }));
    }
  };

  const handleDestinationRemove = (index: number) => {
    setShareData(prev => ({
      ...prev,
      destinataires: prev.destinataires.filter((_, i) => i !== index)
    }));
  };

  const handlePermissionChange = (permissions: string[]) => {
    setShareData(prev => ({
      ...prev,
      permissions
    }));
  };

  const handleSubmit = async () => {
    if (shareData.destinataires.length === 0) {
      setError('Veuillez sélectionner au moins un destinataire');
      return;
    }

    if (shareData.permissions.length === 0) {
      setError('Veuillez sélectionner au moins une permission');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        destinataires: shareData.destinataires,
        permissions: shareData.permissions as any,
        date_expiration: expirationDate ? expirationDate.toISOString() : undefined,
        commentaire: shareData.commentaire,
      };
      await createShareMutation.mutateAsync(payload as any);
      toast({
        title: 'Succès',
        description: 'Document partagé avec succès !',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setShareData({ destinataires: [], permissions: ['lecture'], commentaire: '' });
      setExpirationDate(null);
      loadExistingShares();
      onShareSuccess?.();
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du partage');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId: number) => {
    try {
      await revokeShareMutation.mutateAsync(shareId);
      toast({
        title: 'Succès',
        description: 'Partage révoqué avec succès',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      loadExistingShares();
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de la révocation du partage');
    }
  };

  const getDestinationIcon = (type: string) => {
    return <CustomIcon type={type} size="sm" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="xl" closeOnOverlayClick={true} closeOnEsc={true}>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)" />
        <ModalContent maxW="800px" bg={cardBg} borderColor={borderColor} border="1px" position="relative" zIndex={1400}>
          <ModalHeader bg={cardBg} color={textColor} borderBottom="1px" borderBottomColor={borderColor}>
            <HStack spacing={3}>
              <CustomIcon type="share" size="md" />
              <Text>Partager "{documentTitle}"</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color={textColor} _hover={{ bg: "whiteAlpha.200" }} />

          <ModalBody bg={cardBg} color={textColor} maxHeight="70vh" overflowY="auto">
            {loadingData ? (
              <Box display="flex" justifyContent="center" p={6}>
                <Spinner size="lg" />
              </Box>
            ) : (
              <>
                {/* Messages */}
                {error && (
                  <Alert status="error" mb={4} borderRadius="md">
                    <AlertIcon />
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert status="success" mb={4} borderRadius="md">
                    <AlertIcon />
                    {success}
                  </Alert>
                )}

                <Tabs index={activeTab} onChange={setActiveTab} colorScheme="blue">
                  <TabList borderColor={borderColor}>
                    <Tab color={mutedColor} _selected={{ color: 'blue.300', borderColor: 'blue.300' }}>Nouveau partage</Tab>
                    <Tab color={mutedColor} _selected={{ color: 'blue.300', borderColor: 'blue.300' }}>Partages existants ({existingShares.length})</Tab>
                  </TabList>

                  <TabPanels>
                    <TabPanel px={0}>
                      <VStack spacing={6} align="stretch">
                        {/* Sélection des destinataires */}
                        <Box>
                          <Heading size="md" mb={4} color={textColor}>Destinataires</Heading>

                          {/* Filtres pour les destinataires */}
                          <Box mb={4} p={4} bg={inputBg} borderRadius="md" border="1px" borderColor={borderColor}>
                            <HStack spacing={4} wrap="wrap">
                              <FormControl maxW="200px">
                                <FormLabel fontSize="sm" color={textColor}>Filtrer par type</FormLabel>
                                <Select
                                  value={filterType}
                                  onChange={(e) => setFilterType(e.target.value)}
                                  size="sm"
                                  bg={cardBg}
                                  color={textColor}
                                  borderColor={borderColor}
                                  _hover={{ borderColor: 'blue.500' }}
                                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                                >
                                  <option value="tous" style={{ backgroundColor: cardBg, color: textColor }}>🔍 Tous les types</option>
                                  <option value="utilisateur" style={{ backgroundColor: cardBg, color: textColor }}>👤 Utilisateurs</option>
                                  <option value="role" style={{ backgroundColor: cardBg, color: textColor }}>👥 Rôles</option>
                                  <option value="organisation" style={{ backgroundColor: cardBg, color: textColor }}>🏢 Organisations</option>
                                </Select>
                              </FormControl>
                              
                              <FormControl maxW="300px">
                                <FormLabel fontSize="sm" color={textColor}>Rechercher</FormLabel>
                                <Input
                                  placeholder="Nom, prénom, email..."
                                  value={searchFilter}
                                  onChange={(e) => setSearchFilter(e.target.value)}
                                  size="sm"
                                  bg={cardBg}
                                  color={textColor}
                                  borderColor={borderColor}
                                  _hover={{ borderColor: 'blue.500' }}
                                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                                  _placeholder={{ color: mutedColor }}
                                />
                              </FormControl>
                            </HStack>
                          </Box>

                          <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4} mb={4}>
                            {/* Utilisateurs */}
                            {(filterType === 'tous' || filterType === 'utilisateur') && (
                              <GridItem>
                                <FormControl>
                                  <FormLabel color={textColor}>Utilisateurs</FormLabel>
                                  <Select
                                    placeholder="Sélectionner un utilisateur..."
                                    bg={inputBg}
                                    color={textColor}
                                    borderColor={borderColor}
                                    _hover={{ borderColor: 'blue.500' }}
                                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                                    onChange={(e) => {
                                      const userId = e.target.value;
                                      const user = users.find(u => u.id.toString() === userId);
                                      if (user) {
                                        handleDestinationAdd({
                                          type: 'utilisateur',
                                          id: user.id.toString(),
                                          nom: `${user.prenom} ${user.nom}`
                                        });
                                        e.target.value = '';
                                      }
                                    }}
                                  >
                                    {users
                                      .filter(user => {
                                        if (!searchFilter) return true;
                                        const searchLower = searchFilter.toLowerCase();
                                        return (
                                          user.nom.toLowerCase().includes(searchLower) ||
                                          user.prenom.toLowerCase().includes(searchLower) ||
                                          user.email.toLowerCase().includes(searchLower)
                                        );
                                      })
                                      .map(user => (
                                        <option key={user.id} value={user.id.toString()} style={{ backgroundColor: inputBg, color: textColor }}>
                                          👤 {user.prenom} {user.nom} ({user.email})
                                        </option>
                                      ))}
                                  </Select>
                                </FormControl>
                              </GridItem>
                            )}

                            {/* Rôles */}
                            {(filterType === 'tous' || filterType === 'role') && (
                              <GridItem>
                                <FormControl>
                                  <FormLabel color={textColor}>Rôles</FormLabel>
                                  <Select
                                    placeholder="Sélectionner un rôle..."
                                    bg={inputBg}
                                    color={textColor}
                                    borderColor={borderColor}
                                    _hover={{ borderColor: 'blue.500' }}
                                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                                    onChange={(e) => {
                                      const roleName = e.target.value;
                                      const role = roles.find(r => r.nom === roleName);
                                      if (role) {
                                        handleDestinationAdd({
                                          type: 'role',
                                          id: role.nom,
                                          nom: role.nom
                                        });
                                        e.target.value = '';
                                      }
                                    }}
                                  >
                                    {roles
                                      .filter(role => {
                                        if (!searchFilter) return true;
                                        const searchLower = searchFilter.toLowerCase();
                                        return (
                                          role.nom.toLowerCase().includes(searchLower) ||
                                          role.description.toLowerCase().includes(searchLower)
                                        );
                                      })
                                      .map(role => (
                                        <option key={role.nom} value={role.nom} style={{ backgroundColor: inputBg, color: textColor }}>
                                          👥 {role.nom} - {role.description}
                                        </option>
                                      ))}
                                  </Select>
                                </FormControl>
                              </GridItem>
                            )}

                            {/* Organisations */}
                            {(filterType === 'tous' || filterType === 'organisation') && (
                              <GridItem>
                                <FormControl>
                                  <FormLabel color={textColor}>Organisations</FormLabel>
                                  <Select
                                    placeholder="Sélectionner une organisation..."
                                    bg={inputBg}
                                    color={textColor}
                                    borderColor={borderColor}
                                    _hover={{ borderColor: 'blue.500' }}
                                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                                    onChange={(e) => {
                                      const orgId = e.target.value;
                                      const org = organizations.find(o => o.id.toString() === orgId);
                                      if (org) {
                                        handleDestinationAdd({
                                          type: 'organisation',
                                          id: org.id.toString(),
                                          nom: org.nom
                                        });
                                        e.target.value = '';
                                      }
                                    }}
                                  >
                                    {organizations
                                      .filter(org => {
                                        if (!searchFilter) return true;
                                        const searchLower = searchFilter.toLowerCase();
                                        return (
                                          org.nom.toLowerCase().includes(searchLower) ||
                                          org.description.toLowerCase().includes(searchLower)
                                        );
                                      })
                                      .map(org => (
                                        <option key={org.id} value={org.id.toString()} style={{ backgroundColor: inputBg, color: textColor }}>
                                          🏢 {org.nom} - {org.description}
                                        </option>
                                      ))}
                                  </Select>
                                </FormControl>
                              </GridItem>
                            )}
                          </Grid>

                          {/* Destinataires sélectionnés */}
                          {shareData.destinataires.length > 0 && (
                            <Box>
                              <Text fontSize="sm" color={mutedColor} mb={2}>
                                Destinataires sélectionnés:
                              </Text>
                              <HStack wrap="wrap" spacing={2}>
                                {shareData.destinataires.map((dest, index) => (
                                  <Tag
                                    key={`${dest.type}-${dest.id}`}
                                    size="md"
                                    variant="solid"
                                    colorScheme="blue"
                                  >
                                    {getDestinationIcon(dest.type)}
                                    <TagLabel ml={1}>{dest.nom}</TagLabel>
                                    <TagCloseButton onClick={() => handleDestinationRemove(index)} />
                                  </Tag>
                                ))}
                              </HStack>
                            </Box>
                          )}
                        </Box>

                        {/* Permissions */}
                        <Box>
                          <Heading size="md" mb={4} color={textColor}>Permissions</Heading>
                          <CheckboxGroup
                            value={shareData.permissions}
                            onChange={handlePermissionChange}
                            colorScheme="blue"
                          >
                            <VStack align="start" spacing={3}>
                              {PERMISSIONS_OPTIONS.map((perm) => (
                                <Tooltip key={perm.key} label={perm.description}>
                                  <Checkbox value={perm.key} color={textColor}>
                                    <HStack spacing={2}>
                                      {perm.icon}
                                      <Text color={textColor}>{perm.label}</Text>
                                    </HStack>
                                  </Checkbox>
                                </Tooltip>
                              ))}
                            </VStack>
                          </CheckboxGroup>
                        </Box>

                        {/* Date d'expiration */}
                        <FormControl>
                          <FormLabel color={textColor}>Date d'expiration (optionnelle)</FormLabel>
                          <Input
                            type="datetime-local"
                            bg={inputBg}
                            color={textColor}
                            borderColor={borderColor}
                            _hover={{ borderColor: 'blue.500' }}
                            _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                            value={expirationDate ? format(expirationDate, "yyyy-MM-dd'T'HH:mm") : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                setExpirationDate(new Date(e.target.value));
                              } else {
                                setExpirationDate(null);
                              }
                            }}
                            min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                          />
                        </FormControl>

                        {/* Commentaire */}
                        <FormControl>
                          <FormLabel color={textColor}>Commentaire (optionnel)</FormLabel>
                          <Textarea
                            bg={inputBg}
                            color={textColor}
                            borderColor={borderColor}
                            _hover={{ borderColor: 'blue.500' }}
                            _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                            _placeholder={{ color: mutedColor }}
                            value={shareData.commentaire}
                            onChange={(e) => setShareData(prev => ({ ...prev, commentaire: e.target.value }))}
                            placeholder="Ajoutez un message pour les destinataires..."
                            rows={3}
                          />
                        </FormControl>
                      </VStack>
                    </TabPanel>

                    <TabPanel px={0}>
                      {/* Partages existants */}
                      {existingShares.length === 0 ? (
                        <Box textAlign="center" py={8}>
                          <Text color="gray.500">
                            Aucun partage existant pour ce document
                          </Text>
                        </Box>
                      ) : (
                        <List spacing={3}>
                          {existingShares.map((share, index) => (
                            <Box key={share.id}>
                              <ListItem>
                                <HStack justify="space-between" align="start" w="100%">
                                  <HStack align="start" spacing={3} flex={1}>
                                    {getDestinationIcon(share.type_destinataire)}
                                    <VStack align="start" spacing={1} flex={1}>
                                      <Text fontWeight="medium">{share.destinataire_nom}</Text>
                                      <Text fontSize="sm" color="gray.600">
                                        Permissions: {share.permissions.join(', ')}
                                      </Text>
                                      <Text fontSize="sm" color="gray.600">
                                        Partagé le {formatDate(share.date_partage)} par {share.createur_nom}
                                      </Text>
                                      {share.date_expiration && (
                                        <Text fontSize="sm" color="orange.500">
                                          Expire le {formatDate(share.date_expiration)}
                                        </Text>
                                      )}
                                      {share.commentaire && (
                                        <Text fontSize="sm" color="gray.500" fontStyle="italic">
                                          "{share.commentaire}"
                                        </Text>
                                      )}
                                    </VStack>
                                  </HStack>
                                  <Tooltip label="Révoquer le partage">
                                    <IconButton
                                      aria-label="Révoquer"
                                      size="sm"
                                      variant="ghost"
                                      colorScheme="red"
                                      onClick={() => handleRevokeShare(share.id)}
                                    >
                                      <CustomIcon type="delete" />
                                    </IconButton>
                                  </Tooltip>
                                </HStack>
                              </ListItem>
                              {index < existingShares.length - 1 && <Divider />}
                            </Box>
                          ))}
                        </List>
                      )}
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </>
            )}
          </ModalBody>

          <ModalFooter bg={cardBg} borderTop="1px" borderTopColor={borderColor}>
            <Button mr={3} onClick={onClose} variant="ghost" color={textColor} _hover={{ bg: "whiteAlpha.200" }}>
              Fermer
            </Button>
            {activeTab === 0 && (
              <Button
                colorScheme="blue"
                onClick={handleSubmit}
                isLoading={loading}
                loadingText="Partage..."
                isDisabled={shareData.destinataires.length === 0}
                leftIcon={<CustomIcon type="share" />}
              >
                Partager
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
  );
};

export default ShareModal; 

