import React, { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  useToast,
  Flex,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Spinner,
  HStack,
  VStack,
  IconButton,
  Card,
  CardBody,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Container,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  TableContainer,
  ButtonGroup,
  Checkbox,
} from "@chakra-ui/react";
import { SearchIcon, DeleteIcon, RepeatIcon } from "@chakra-ui/icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import config from "../config";
import RequireRole from './RequireRole';
import { listTrash, restoreTrashItem as apiRestoreTrashItem, deleteTrashItem as apiDeleteTrashItem, bulkRestore, bulkDelete } from "../services/trashService";

interface TrashItem {
  id: number;
  item_id: number;
  item_type: string;
  title: string;
  description?: string;
  size: number;
  size_bytes: number;
  deleted_at: string;
  deleted_by: number;
  deleted_by_name: string;
  days_until_deletion: number;
}

interface TrashStats {
  total_items: number;
  pending_deletion: number;
  restored_items: number;
  permanently_deleted: number;
  total_size_formatted: string;
}

const Trash: React.FC = () => {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [stats, setStats] = useState<TrashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(20);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [hasPrev, setHasPrev] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toast = useToast();
  const bgColor = useColorModeValue("white", "#1a202c");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.800", "white");
  const mutedColor = useColorModeValue("gray.600", "gray.400");
  const cardBg = useColorModeValue("gray.50", "#2d3748");

  const getAuthToken = () => localStorage.getItem("token");

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredItems.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds(prev => checked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id));
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkRestore(selectedIds);
      toast({ title: 'Succès', description: `${selectedIds.length} éléments restaurés`, status: 'success', duration: 3000, isClosable: true });
      setSelectedIds([]);
      fetchTrashItems();
      fetchStats();
    } catch (e) {
      toast({ title: 'Erreur', description: `Impossible de restaurer la sélection`, status: 'error', duration: 5000, isClosable: true });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkDelete(selectedIds);
      toast({ title: 'Succès', description: `${selectedIds.length} éléments supprimés définitivement`, status: 'success', duration: 3000, isClosable: true });
      setSelectedIds([]);
      fetchTrashItems();
      fetchStats();
    } catch (e) {
      toast({ title: 'Erreur', description: `Impossible de supprimer la sélection`, status: 'error', duration: 5000, isClosable: true });
    }
  };

  const fetchTrashItems = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        page,
        per_page: perPage,
      };
      if (filterType && filterType !== 'all') params.type = filterType;
      if (searchTerm && searchTerm.trim()) params.search = searchTerm.trim();

      const data = await listTrash(params);
      console.log("🔍 [DEBUG] Données reçues:", data);

      // Gérer différents formats de réponse
      if (Array.isArray(data)) {
        console.log("🔍 [DEBUG] Format: tableau");
        setItems(data);
        console.log("🔍 [DEBUG] Items définis (array):", data.length);
      } else if (data.items && Array.isArray(data.items)) {
        console.log("🔍 [DEBUG] Format: objet avec tableau items");
        setItems(data.items);
        console.log("🔍 [DEBUG] Items définis (object):", data.items.length);
        if (typeof data.has_next !== 'undefined') setHasNext(!!data.has_next);
        if (typeof data.has_prev !== 'undefined') setHasPrev(!!data.has_prev);
        if (typeof data.page === 'number') setPage(data.page);
        if (typeof data.per_page === 'number') setPerPage(data.per_page);
      } else {
        console.log("🔍 [DEBUG] Format: inconnu", data);
        setItems([]);
        console.log("🔍 [DEBUG] Aucun item trouvé");
      }
    } catch (error) {
      console.error("🔍 [DEBUG] Erreur complète:", error);
      setError("Impossible de charger les éléments de la corbeille");
      
      toast({
        title: "Erreur",
        description: "Impossible de charger les éléments de la corbeille",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${config.API_URL}/api/trash/stats`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        mode: "cors",
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
        console.log("Stats chargées:", data);
      }
    } catch (error) {
      console.error("Erreur stats:", error);
    }
  };

  const restoreItem = async (itemId: number) => {
    try {
      await apiRestoreTrashItem(itemId);

      toast({
        title: "Succès",
        description: "Élément restauré avec succès",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      fetchTrashItems();
      fetchStats();
    } catch (error) {
      console.error("Erreur restauration:", error);
      toast({
        title: "Erreur",
        description: "Impossible de restaurer l'élément",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const deleteItem = async (itemId: number) => {
    try {
      await apiDeleteTrashItem(itemId);

      toast({
        title: "Succès",
        description: "Élément supprimé définitivement",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      fetchTrashItems();
      fetchStats();
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'élément",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getUrgencyColor = (daysUntilDeletion: number) => {
    if (daysUntilDeletion <= 7) return "red";
    if (daysUntilDeletion <= 14) return "orange";
    return "green";
  };

  useEffect(() => {
    console.log("Chargement initial de la corbeille");
    fetchTrashItems();
    fetchStats();
  }, []);

  // Recharger lors des changements de page/filtre/recherche
  useEffect(() => {
    fetchTrashItems();
  }, [page, perPage, filterType]);

  // Déclencher recherche après saisie (simple: on Enter ou bouton actualiser). Ici, on relance sur changement.
  useEffect(() => {
    const t = setTimeout(() => fetchTrashItems(), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === "all" || item.item_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack spacing={6}>
          <Spinner size="xl" color="blue.500" />
          <Text color="white">Chargement de la corbeille...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <RequireRole roles={["admin", "archiviste"]}>
    <Container maxW="7xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* En-tête */}
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={1}>
            <Heading size="lg" color="white">
              🗑️ Corbeille
            </Heading>
            <Text color="gray.300">
              Gérez les éléments supprimés de votre système
            </Text>
          </VStack>
          <HStack spacing={2}>
            <IconButton
              aria-label="Actualiser"
              icon={<RepeatIcon />}
              onClick={fetchTrashItems}
              variant="outline"
              borderColor="gray.600"
              color="white"
              _hover={{ bg: "gray.700" }}
            />
            <Button
              size="sm"
              colorScheme="green"
              variant="solid"
              onClick={handleBulkRestore}
              isDisabled={selectedIds.length === 0}
            >
              Restaurer sélection ({selectedIds.length})
            </Button>
            <Button
              size="sm"
              colorScheme="red"
              variant="outline"
              onClick={handleBulkDelete}
              isDisabled={selectedIds.length === 0}
            >
              Supprimer sélection ({selectedIds.length})
            </Button>
          </HStack>
        </Flex>

        {/* Filtres et recherche */}
        <Card bg="gray.700">
          <CardBody>
            <Flex direction={{ base: "column", md: "row" }} gap={4}>
              <InputGroup flex={2}>
                <InputLeftElement>
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Rechercher dans la corbeille..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  bg="gray.800"
                  borderColor="gray.600"
                  color="white"
                  _placeholder={{ color: "gray.400" }}
                />
              </InputGroup>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                maxW="200px"
                bg="gray.800"
                borderColor="gray.600"
                color="white"
              >
                <option value="all">Tous les types</option>
                <option value="document">Documents</option>
                <option value="folder">Dossiers</option>
              </Select>
              <Select
                value={perPage}
                onChange={(e) => setPerPage(parseInt(e.target.value) || 20)}
                maxW="150px"
                bg="gray.800"
                borderColor="gray.600"
                color="white"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </Select>
            </Flex>
          </CardBody>
        </Card>

        {/* Message d'erreur */}
        {error && (
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Erreur!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Liste des éléments */}
        {filteredItems.length === 0 ? (
          <Card bg="gray.700">
            <CardBody>
              <VStack spacing={4} py={8}>
                <DeleteIcon boxSize={12} color="gray.400" />
                <Text fontSize="lg" color="gray.300">
                  {items.length === 0 ? "La corbeille est vide" : "Aucun élément trouvé"}
                </Text>
                <Text color="gray.400" textAlign="center">
                  {items.length === 0 
                    ? "Les éléments supprimés apparaîtront ici."
                    : "Essayez de modifier vos critères de recherche."
                  }
                </Text>
                {items.length === 0 && (
                  <Text fontSize="sm" color="orange.300">
                    Nombre d'éléments chargés: {items.length}
                  </Text>
                )}
              </VStack>
            </CardBody>
          </Card>
        ) : (
          <Card bg="gray.700">
            <CardBody p={0}>
              <TableContainer>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th color="gray.300" width="40px">
                        <Checkbox
                          isChecked={selectedIds.length > 0 && selectedIds.length === filteredItems.length}
                          isIndeterminate={selectedIds.length > 0 && selectedIds.length < filteredItems.length}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                        />
                      </Th>
                      <Th color="gray.300">Élément</Th>
                      <Th color="gray.300">Type</Th>
                      <Th color="gray.300">Taille</Th>
                      <Th color="gray.300">Supprimé par</Th>
                      <Th color="gray.300">Supprimé le</Th>
                      <Th color="gray.300">Expiration</Th>
                      <Th color="gray.300">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredItems.map((item) => (
                      <Tr key={item.id} _hover={{ bg: "gray.600" }}>
                        <Td>
                          <Checkbox
                            isChecked={selectedIds.includes(item.id)}
                            onChange={(e) => toggleSelectOne(item.id, e.target.checked)}
                          />
                        </Td>
                        <Td>
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="medium" noOfLines={1} color="white">
                              {item.title}
                            </Text>
                            {item.description && (
                              <Text fontSize="sm" color="gray.400" noOfLines={1}>
                                {item.description}
                              </Text>
                            )}
                          </VStack>
                        </Td>
                        <Td>
                          <Badge colorScheme={item.item_type === "document" ? "blue" : "green"}>
                            {item.item_type === "document" ? "Document" : "Dossier"}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontSize="sm" color="gray.300">
                            {formatFileSize(item.size_bytes || item.size || 0)}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="sm" color="gray.300">{item.deleted_by_name}</Text>
                        </Td>
                        <Td>
                          <Text fontSize="sm" color="gray.300">
                            {format(new Date(item.deleted_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </Text>
                        </Td>
                        <Td>
                          <Badge colorScheme={getUrgencyColor(item.days_until_deletion)}>
                            {item.days_until_deletion} jours
                          </Badge>
                        </Td>
                        <Td>
                          <ButtonGroup size="sm">
                            <Button
                              leftIcon={<RepeatIcon />}
                              colorScheme="green"
                              variant="outline"
                              onClick={() => restoreItem(item.id)}
                              size="xs"
                            >
                              Restaurer
                            </Button>
                            <Button
                              leftIcon={<DeleteIcon />}
                              colorScheme="red"
                              variant="outline"
                              onClick={() => deleteItem(item.id)}
                              size="xs"
                            >
                              Supprimer
                            </Button>
                          </ButtonGroup>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
              <Flex justify="space-between" align="center" p={4}>
                <HStack>
                  <Button size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} isDisabled={!hasPrev}>
                    Précédent
                  </Button>
                  <Button size="sm" onClick={() => setPage((p) => p + 1)} isDisabled={!hasNext}>
                    Suivant
                  </Button>
                </HStack>
                <Text color="gray.300">Page {page}</Text>
              </Flex>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Container>
    </RequireRole>
  );
};

export default Trash; 

