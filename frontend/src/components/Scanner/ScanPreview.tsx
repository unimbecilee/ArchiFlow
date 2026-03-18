import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  Heading,
  VStack,
  HStack,
  Image,
  Text,
  Button,
  IconButton,
  SimpleGrid,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Spinner,
} from '@chakra-ui/react';
import {
  FiEye,
  FiDownload,
  FiTrash2,
  FiZoomIn,
  FiZoomOut,
  FiRotateCw,
} from 'react-icons/fi';
import axios from 'axios';

interface ScanPage {
  id: string;
  task_id: string;
  page_number: number;
  original_path: string;
  processed_path: string;
  ocr_text?: string;
  metadata?: any;
  created_at: string;
  processed_at?: string;
}

interface ScanPreviewProps {
  taskId: string;
  onPageDelete?: (pageId: string) => void;
}

const ScanPreview: React.FC<ScanPreviewProps> = ({ taskId, onPageDelete }) => {
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPage, setSelectedPage] = useState<ScanPage | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const fetchPages = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/scanner/tasks/${taskId}/pages`);

      if (response.data.success) {
        setPages(response.data.pages);
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Impossible de charger les pages',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchPages();
    }
  }, [taskId]);

  const handleViewPage = async (page: ScanPage) => {
    setSelectedPage(page);
    setZoom(100);
    setRotation(0);
    
    try {
      // Obtenir l'URL présignée pour l'image
      const response = await axios.get(
        `/api/scanner/pages/${page.id}/url`
      );
      
      if (response.data.success) {
        setImageUrl(response.data.url);
        onOpen();
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger l\'image',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDownloadPage = async (page: ScanPage) => {
    try {
      const response = await axios.get(
        `/api/scanner/pages/${page.id}/download`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `page_${page.page_number}.jpg`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: 'Téléchargement réussi',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Erreur de téléchargement',
        description: error.response?.data?.error || 'Impossible de télécharger la page',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeletePage = async (page: ScanPage) => {
    if (!window.confirm(`Supprimer la page ${page.page_number} ?`)) {
      return;
    }

    try {
      const response = await axios.delete(`/api/scanner/pages/${page.id}`);

      if (response.data.success) {
        setPages(pages.filter((p) => p.id !== page.id));
        
        if (onPageDelete) {
          onPageDelete(page.id);
        }

        toast({
          title: 'Page supprimée',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erreur de suppression',
        description: error.response?.data?.error || 'Impossible de supprimer la page',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Pages numérisées ({pages.length})</Heading>
        <Button size="sm" onClick={fetchPages} isLoading={loading}>
          Actualiser
        </Button>
      </HStack>

      {loading && pages.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Spinner size="xl" color="blue.500" mb={4} />
          <Text color="gray.600">Chargement des pages...</Text>
        </Box>
      ) : pages.length === 0 ? (
        <Card>
          <CardBody>
            <Text textAlign="center" color="gray.600" py={8}>
              Aucune page numérisée
            </Text>
          </CardBody>
        </Card>
      ) : (
        <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={4}>
          {pages.map((page) => (
            <Card key={page.id} position="relative">
              <CardBody p={3}>
                <VStack spacing={2} align="stretch">
                  {/* Miniature */}
                  <Box
                    position="relative"
                    bg="gray.100"
                    borderRadius="md"
                    overflow="hidden"
                    aspectRatio={1}
                    cursor="pointer"
                    onClick={() => handleViewPage(page)}
                    _hover={{ opacity: 0.8 }}
                  >
                    <Box
                      position="absolute"
                      top="50%"
                      left="50%"
                      transform="translate(-50%, -50%)"
                    >
                      <Text fontSize="4xl" color="gray.400">
                        {page.page_number}
                      </Text>
                    </Box>
                  </Box>

                  {/* Informations */}
                  <VStack spacing={1} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="bold">
                        Page {page.page_number}
                      </Text>
                      {page.ocr_text && (
                        <Badge colorScheme="orange" fontSize="xs">
                          OCR
                        </Badge>
                      )}
                    </HStack>

                    {page.processed_at && (
                      <Badge colorScheme="green" fontSize="xs">
                        Traitée
                      </Badge>
                    )}
                  </VStack>

                  {/* Actions */}
                  <HStack spacing={1}>
                    <IconButton
                      aria-label="Voir"
                      icon={<FiEye />}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewPage(page)}
                    />
                    <IconButton
                      aria-label="Télécharger"
                      icon={<FiDownload />}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownloadPage(page)}
                    />
                    <IconButton
                      aria-label="Supprimer"
                      icon={<FiTrash2 />}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleDeletePage(page)}
                    />
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Modal de visualisation */}
      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Page {selectedPage?.page_number}
            <HStack spacing={2} mt={2}>
              <IconButton
                aria-label="Zoom in"
                icon={<FiZoomIn />}
                size="sm"
                onClick={handleZoomIn}
              />
              <IconButton
                aria-label="Zoom out"
                icon={<FiZoomOut />}
                size="sm"
                onClick={handleZoomOut}
              />
              <IconButton
                aria-label="Rotate"
                icon={<FiRotateCw />}
                size="sm"
                onClick={handleRotate}
              />
              <Text fontSize="sm" color="gray.600">
                {zoom}%
              </Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Box
              maxH="70vh"
              overflow="auto"
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={`Page ${selectedPage?.page_number}`}
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.3s',
                  }}
                />
              ) : (
                <Spinner size="xl" />
              )}
            </Box>

            {selectedPage?.ocr_text && (
              <Box mt={4} p={4} bg="gray.50" borderRadius="md">
                <Heading size="sm" mb={2}>
                  Texte reconnu (OCR)
                </Heading>
                <Text fontSize="sm" whiteSpace="pre-wrap">
                  {selectedPage.ocr_text}
                </Text>
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ScanPreview;
