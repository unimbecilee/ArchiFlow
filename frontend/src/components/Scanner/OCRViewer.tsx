import React, { useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  Heading,
  VStack,
  HStack,
  Text,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  IconButton,
  useToast,
  Textarea,
  Divider,
} from '@chakra-ui/react';
import { FiCopy, FiDownload, FiEdit2, FiSave } from 'react-icons/fi';

interface OCRMetadata {
  dates?: string[];
  emails?: string[];
  phones?: string[];
  amounts?: string[];
  document_numbers?: string[];
}

interface OCRViewerProps {
  text: string;
  metadata?: OCRMetadata;
  confidence?: number;
  onTextUpdate?: (newText: string) => void;
  editable?: boolean;
}

const OCRViewer: React.FC<OCRViewerProps> = ({
  text,
  metadata,
  confidence,
  onTextUpdate,
  editable = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const toast = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Texte copié',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ocr_text.txt');
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast({
      title: 'Fichier téléchargé',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleSave = () => {
    if (onTextUpdate) {
      onTextUpdate(editedText);
    }
    setIsEditing(false);
    toast({
      title: 'Texte mis à jour',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const getConfidenceColor = (conf?: number) => {
    if (!conf) return 'gray';
    if (conf >= 90) return 'green';
    if (conf >= 70) return 'yellow';
    return 'red';
  };

  const getConfidenceLabel = (conf?: number) => {
    if (!conf) return 'Inconnue';
    if (conf >= 90) return 'Excellente';
    if (conf >= 70) return 'Bonne';
    return 'Faible';
  };

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Texte reconnu (OCR)</Heading>
        <HStack>
          {confidence !== undefined && (
            <Badge colorScheme={getConfidenceColor(confidence)} fontSize="sm">
              Confiance: {confidence}% ({getConfidenceLabel(confidence)})
            </Badge>
          )}
          <IconButton
            aria-label="Copier"
            icon={<FiCopy />}
            size="sm"
            onClick={handleCopy}
          />
          <IconButton
            aria-label="Télécharger"
            icon={<FiDownload />}
            size="sm"
            onClick={handleDownload}
          />
          {editable && !isEditing && (
            <IconButton
              aria-label="Éditer"
              icon={<FiEdit2 />}
              size="sm"
              colorScheme="blue"
              onClick={() => setIsEditing(true)}
            />
          )}
          {isEditing && (
            <IconButton
              aria-label="Sauvegarder"
              icon={<FiSave />}
              size="sm"
              colorScheme="green"
              onClick={handleSave}
            />
          )}
        </HStack>
      </HStack>

      <Tabs colorScheme="blue">
        <TabList>
          <Tab>Texte</Tab>
          {metadata && <Tab>Métadonnées</Tab>}
        </TabList>

        <TabPanels>
          {/* Onglet Texte */}
          <TabPanel px={0}>
            <Card>
              <CardBody>
                {isEditing ? (
                  <Textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    minH="400px"
                    fontFamily="monospace"
                    fontSize="sm"
                  />
                ) : (
                  <Text
                    whiteSpace="pre-wrap"
                    fontFamily="monospace"
                    fontSize="sm"
                    minH="400px"
                  >
                    {text || 'Aucun texte reconnu'}
                  </Text>
                )}
              </CardBody>
            </Card>
          </TabPanel>

          {/* Onglet Métadonnées */}
          {metadata && (
            <TabPanel px={0}>
              <VStack spacing={4} align="stretch">
                {/* Dates */}
                {metadata.dates && metadata.dates.length > 0 && (
                  <Card>
                    <CardBody>
                      <Heading size="sm" mb={3}>
                        Dates détectées
                      </Heading>
                      <VStack align="stretch" spacing={2}>
                        {metadata.dates.map((date, index) => (
                          <HStack key={index}>
                            <Badge colorScheme="blue">{date}</Badge>
                          </HStack>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Emails */}
                {metadata.emails && metadata.emails.length > 0 && (
                  <Card>
                    <CardBody>
                      <Heading size="sm" mb={3}>
                        Emails détectés
                      </Heading>
                      <VStack align="stretch" spacing={2}>
                        {metadata.emails.map((email, index) => (
                          <HStack key={index}>
                            <Badge colorScheme="purple">{email}</Badge>
                          </HStack>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Téléphones */}
                {metadata.phones && metadata.phones.length > 0 && (
                  <Card>
                    <CardBody>
                      <Heading size="sm" mb={3}>
                        Téléphones détectés
                      </Heading>
                      <VStack align="stretch" spacing={2}>
                        {metadata.phones.map((phone, index) => (
                          <HStack key={index}>
                            <Badge colorScheme="green">{phone}</Badge>
                          </HStack>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Montants */}
                {metadata.amounts && metadata.amounts.length > 0 && (
                  <Card>
                    <CardBody>
                      <Heading size="sm" mb={3}>
                        Montants détectés
                      </Heading>
                      <VStack align="stretch" spacing={2}>
                        {metadata.amounts.map((amount, index) => (
                          <HStack key={index}>
                            <Badge colorScheme="orange">{amount}</Badge>
                          </HStack>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Numéros de document */}
                {metadata.document_numbers && metadata.document_numbers.length > 0 && (
                  <Card>
                    <CardBody>
                      <Heading size="sm" mb={3}>
                        Numéros de document détectés
                      </Heading>
                      <VStack align="stretch" spacing={2}>
                        {metadata.document_numbers.map((docNum, index) => (
                          <HStack key={index}>
                            <Badge colorScheme="cyan">{docNum}</Badge>
                          </HStack>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Aucune métadonnée */}
                {(!metadata.dates || metadata.dates.length === 0) &&
                  (!metadata.emails || metadata.emails.length === 0) &&
                  (!metadata.phones || metadata.phones.length === 0) &&
                  (!metadata.amounts || metadata.amounts.length === 0) &&
                  (!metadata.document_numbers || metadata.document_numbers.length === 0) && (
                    <Card>
                      <CardBody>
                        <Text textAlign="center" color="gray.600">
                          Aucune métadonnée détectée
                        </Text>
                      </CardBody>
                    </Card>
                  )}
              </VStack>
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default OCRViewer;
