import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  StyleSheet,
  StatusBar,
  ScrollView,
  Vibration,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { projectsAPI } from '../../../utils/api';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe vibration function for cross-device compatibility
const safeVibrate = (pattern) => {
  if (Platform.OS === 'web') {
    // Vibration not supported on web
    return;
  }
  try {
    if (Array.isArray(pattern)) {
      Vibration.vibrate(pattern);
    } else {
      Vibration.vibrate(pattern || 50);
    }
  } catch (error) {
    console.log('[Vibration] Not supported:', error.message);
  }
};

// Import building components
import buildingBase from '../../../../assets/buildingBase.png';
import buildingFloor from '../../../../assets/buildingFloor.png';
import buildingTop from '../../../../assets/buildingTop.png';
import elevatorClosed from '../../../../assets/elevatorClosed.png';
import elevatorOpen from '../../../../assets/elevatorOpen.png';
import elevatorPeople from '../../../../assets/elevatorPeople.png';

// Preload images for faster rendering
const preloadImages = async () => {
  try {
    const cacheImages = [
      buildingBase,
      buildingFloor,
      buildingTop,
      elevatorClosed,
      elevatorOpen,
      elevatorPeople,
    ].map(image => {
      return Asset.fromModule(image).downloadAsync();
    });

    await Promise.all(cacheImages);
    console.log('All timeline images preloaded successfully');
  } catch (error) {
    console.warn('Error preloading images:', error);
  }
};

// Default timeline stages
const defaultTimelineStages = [
  { id: 0, name: 'Foundation', status: 'completed', color: '#388E3C', icon: 'construct-outline' },
  { id: 1, name: 'Structure', status: 'in-progress', color: '#D4AF37', icon: 'business-outline' },
  { id: 2, name: 'Finishing', status: 'pending', color: '#666666', icon: 'color-palette-outline' },
];

export default function DynamicElevatorTimeline({ timeline, isEmbedded = false }) {
  const route = useRoute();
  const navigation = useNavigation();
  const { projectId } = route.params || {};

  // Use dynamic window dimensions for screen compatibility
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // State for project data
  const [project, setProject] = useState(null);
  const [timelineData, setTimelineData] = useState({
    projectName: "Loading...",
    stages: defaultTimelineStages
  });
  const [isLoading, setIsLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  // Animation states
  const [currentFloor, setCurrentFloor] = useState(0);
  const [previousFloor, setPreviousFloor] = useState(0);
  const [liftState, setLiftState] = useState("closed");
  const [isMoving, setIsMoving] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [visitCount, setVisitCount] = useState(0);

  const elevatorY = useRef(new Animated.Value(0)).current;
  const floorScaleAnimations = useRef(
    defaultTimelineStages.map(() => new Animated.Value(1))
  ).current;

  // Dynamic building dimensions - responsive to screen size
  const SCALE_FACTOR = Math.min(screenWidth / 390, 1.2); // Cap scale for larger screens
  const BASE_HEIGHT = 150 * SCALE_FACTOR;
  const FLOOR_HEIGHT = Math.min(130 * SCALE_FACTOR, screenHeight * 0.18); // Cap floor height
  const TOP_HEIGHT = 110 * SCALE_FACTOR;
  const numberOfStages = timelineData.stages.length;
  const totalBuildingHeight = BASE_HEIGHT + (FLOOR_HEIGHT * numberOfStages) + TOP_HEIGHT;
  const buildingWidth = Math.min(screenWidth * 0.92, 400); // Cap max width for larger screens

  // KEY FUNCTION: Calculate Y position for a floor (Floor 0 = bottom)
  const getFloorYPosition = (floorNumber) => {
    // Floor 0 is at the bottom, so we calculate from the base
    return BASE_HEIGHT + (floorNumber * FLOOR_HEIGHT) + (FLOOR_HEIGHT * 0.45);
  };

  // Preload images on mount
  useEffect(() => {
    const loadImages = async () => {
      await preloadImages();
      setImagesLoaded(true);
    };
    loadImages();
  }, []);

  // Load previous floor from storage and set up for animation
  useEffect(() => {
    const loadPreviousFloor = async () => {
      try {
        const saved = await AsyncStorage.getItem(`elevator_floor_${projectId}`);
        if (saved !== null) {
          const savedFloor = parseInt(saved, 10);
          console.log('[Timeline] Loaded previous floor from storage:', savedFloor);
          setPreviousFloor(savedFloor);

          // Set initial elevator position to previous floor WITHOUT animation
          const initialY = getFloorYPosition(savedFloor);
          elevatorY.setValue(initialY);
          setCurrentFloor(savedFloor);
          setLiftState("closed"); // Start with doors closed
        } else {
          // No saved floor, start at Floor 0
          console.log('[Timeline] No saved floor, starting at Floor 0');
          setPreviousFloor(0);
          const initialY = getFloorYPosition(0);
          elevatorY.setValue(initialY);
          setCurrentFloor(0);
          setLiftState("closed");
        }
      } catch (error) {
        console.error('Error loading previous floor:', error);
        setPreviousFloor(0);
        elevatorY.setValue(getFloorYPosition(0));
        setCurrentFloor(0);
        setLiftState("closed");
      }
    };

    if (projectId) {
      loadPreviousFloor();
    }
  }, [projectId]);

  // Trigger animation when screen comes into focus (every visit)
  useFocusEffect(
    React.useCallback(() => {
      console.log('[Timeline] Screen focused - will trigger animation');

      // Reset animation states when screen comes into focus
      if (project && timelineData.stages.length > 0) {
        // Small delay to ensure everything is ready
        const timer = setTimeout(() => {
          setShouldAnimate(true);
        }, 300);

        return () => clearTimeout(timer);
      }
    }, [project, timelineData.stages.length])
  );

  // Trigger animation when both project data and target floor are ready
  useEffect(() => {
    if (!isLoading && imagesLoaded && timelineData.stages.length > 0 && project && !isMoving) {
      console.log('[Timeline] Data ready for animation');
    }
  }, [isLoading, imagesLoaded, timelineData.stages.length, project]);

  // Auto-animate to current floor EVERY TIME the page is visited
  useEffect(() => {
    if (!shouldAnimate || isMoving || !imagesLoaded) return;

    console.log('[Timeline] Starting animation sequence');

    // Determine target floor based on progress
    // If progress is 100%, it should be at the top floor
    const totalStages = timelineData.stages.length;
    const currentProgress = project?.progress?.percentage || 0;

    // Map percentage to floor index (0 to totalStages - 1)
    let targetFloor = 0;
    if (totalStages > 0) {
      targetFloor = Math.min(
        Math.floor((currentProgress / 100) * totalStages),
        totalStages - 1
      );
    }

    console.log('[Timeline] Progress:', currentProgress, '% - Target floor:', targetFloor);
    console.log('[Timeline] Previous floor:', previousFloor, '- Will animate to:', targetFloor);

    // Reset animation trigger
    setShouldAnimate(false);

    // Always show animation, even if at same floor (doors close then open)
    setTimeout(() => {
      setIsMoving(true);
      setLiftState("closed");
      safeVibrate(50);

      const currentY = getFloorYPosition(previousFloor);
      const targetY = getFloorYPosition(targetFloor);
      const distance = Math.abs(targetFloor - previousFloor);

      // If same floor, just do a quick door animation
      if (distance === 0) {
        console.log('[Timeline] Same floor - door animation only');
        setTimeout(() => {
          setLiftState("open");
          setTimeout(() => {
            setLiftState("people");
            setIsMoving(false);
            safeVibrate([100, 50, 100]);
          }, 600);
        }, 800);
        return;
      }

      // Different floor - animate movement
      const duration = Math.max(1500, distance * 800);
      console.log('[Timeline] Moving from Y:', currentY, 'to Y:', targetY, 'Duration:', duration);

      Animated.timing(elevatorY, {
        toValue: targetY,
        duration: duration,
        useNativeDriver: true,
      }).start(() => {
        console.log('[Timeline] Animation complete - arrived at floor', targetFloor);
        setCurrentFloor(targetFloor);
        setPreviousFloor(targetFloor); // Update previous floor for next visit

        // Save current floor to storage for next visit
        AsyncStorage.setItem(`elevator_floor_${projectId}`, targetFloor.toString())
          .catch(err => console.error('Error saving floor:', err));

        setTimeout(() => {
          setLiftState("open");
          setTimeout(() => {
            setLiftState("people");
            setIsMoving(false);
            safeVibrate([100, 50, 100]);
            console.log('[Timeline] Elevator sequence complete at floor', targetFloor);
          }, 600);
        }, 400);
      });
    }, 800); // Delay before starting animation
  }, [shouldAnimate, imagesLoaded]);

  const loadProjectTimeline = async () => {
    try {
      setIsLoading(true);
      const response = await projectsAPI.getProjectById(projectId);

      if (response.success && response.data.project) {
        const projectData = response.data.project;
        setProject(projectData);

        // Also load timeline events which contain startDate/endDate
        let timelineEvents = [];
        try {
          const timelineResponse = await projectsAPI.getTimeline(projectId);
          if (timelineResponse.success) {
            timelineEvents = timelineResponse.data?.events || [];
          }
        } catch (err) {
          console.log('No timeline events found');
        }

        // Only show stages if they exist in the project's timeline milestones
        let stages = [];
        const milestones = projectData.timeline?.milestones || [];

        if (milestones.length > 0) {
          stages = milestones.map((m, index) => {
            // Find matching timeline event for dates
            const matchedEvent = timelineEvents.find(e =>
              e.title?.toLowerCase().includes(m.title?.toLowerCase() || m.name?.toLowerCase())
            );

            return {
              id: index,
              name: m.title || m.name || `Phase ${index + 1}`,
              description: m.description || '',
              duration: `Floor ${index}`,
              color: m.status === 'completed' ? '#388E3C' : m.status === 'in-progress' ? '#D4AF37' : '#666666',
              darkColor: m.status === 'completed' ? '#2E7D32' : m.status === 'in-progress' ? '#936C09' : '#444444',
              icon: m.icon || (m.status === 'completed' ? 'checkmark-circle' : 'time-outline'),
              status: m.status || 'pending',
              startDate: matchedEvent?.startDate || m.startDate,
              endDate: matchedEvent?.endDate || m.endDate,
            };
          });
        }

        setTimelineData({
          projectName: projectData?.title || "Project Timeline",
          stages: stages.length > 0 ? stages : defaultTimelineStages
        });
      }
    } catch (error) {
      console.error('Error loading project timeline:', error);
      Alert.alert('Error', 'Failed to load project timeline');
    } finally {
      setIsLoading(false);
    }
  };

  // Load project data
  useEffect(() => {
    if (projectId) {
      loadProjectTimeline();
    } else {
      setIsLoading(false);
    }
  }, [projectId]);

  const getLiftImage = () => {
    switch (liftState) {
      case "open":
        return elevatorOpen;
      case "people":
        return elevatorPeople;
      default:
        return elevatorClosed;
    }
  };

  const moveElevator = (toFloor) => {
    console.log('[Elevator] Manual move from', currentFloor, 'to', toFloor);

    if (toFloor === currentFloor || toFloor < 0 || toFloor >= timelineData.stages.length) {
      console.log('[Elevator] Invalid move');
      return;
    }

    setIsMoving(true);
    setLiftState("closed");
    setPreviousFloor(currentFloor);

    Vibration.vibrate(50);

    const targetY = getFloorYPosition(toFloor);
    const distance = Math.abs(toFloor - currentFloor);
    const duration = Math.max(1200, distance * 600);

    setTimeout(() => {
      Animated.timing(elevatorY, {
        toValue: targetY,
        duration: duration,
        useNativeDriver: true,
      }).start(() => {
        console.log('[Elevator] Arrived at floor', toFloor);
        setCurrentFloor(toFloor);

        // Save floor to storage
        AsyncStorage.setItem(`elevator_floor_${projectId}`, toFloor.toString())
          .catch(err => console.error('Error saving floor:', err));

        setTimeout(() => {
          setLiftState("open");
          setTimeout(() => {
            setLiftState("people");
            setIsMoving(false);
            Vibration.vibrate([100, 50, 100]);
          }, 600);
        }, 400);
      });
    }, 300);
  };

  const renderDynamicBuilding = () => {
    const components = [];
    let currentY = 0;

    // 1. Building Top (rendered first, at top)
    components.push(
      <Image
        key="building-top"
        source={buildingTop}
        style={[
          styles.buildingComponent,
          {
            top: currentY,
            width: buildingWidth,
            height: TOP_HEIGHT,
          }
        ]}
        resizeMode="stretch"
        fadeDuration={0}
        cache="force-cache"
      />
    );
    currentY += TOP_HEIGHT;

    // 2. Floors - REVERSED ORDER (top floor to bottom floor visually)
    // But numbered bottom to top (Floor 0 at bottom)
    for (let visualIndex = numberOfStages - 1; visualIndex >= 0; visualIndex--) {
      const floorNumber = visualIndex; // Floor number (0 = bottom)
      const stage = timelineData.stages[floorNumber];
      const isCurrentFloor = currentFloor === floorNumber;
      const isPreviousFloor = previousFloor === floorNumber;

      components.push(
        <Animated.View
          key={`floor-${floorNumber}`}
          style={[
            styles.floorContainer,
            {
              top: currentY,
              transform: [{ scale: floorScaleAnimations[floorNumber] }],
            }
          ]}
        >
          <Image
            source={buildingFloor}
            style={[
              styles.buildingComponent,
              {
                width: buildingWidth,
                height: FLOOR_HEIGHT,
                opacity: isCurrentFloor ? 1 : 0.9,
              }
            ]}
            resizeMode="stretch"
            fadeDuration={0}
            cache="force-cache"
          />

          {/* Floor highlight */}
          {(isCurrentFloor || isPreviousFloor) && (
            <View
              style={[
                styles.floorHighlight,
                {
                  backgroundColor: isCurrentFloor
                    ? stage.color + '30'
                    : stage.color + '15',
                  width: buildingWidth,
                  height: FLOOR_HEIGHT
                }
              ]}
            />
          )}

          {/* Floor information - Left side */}
          <View style={styles.floorInfo}>
            <TouchableOpacity
              onPress={() => moveElevator(floorNumber)}
              disabled={isMoving || currentFloor === floorNumber}
            >
              <View style={[
                styles.floorNumber,
                {
                  backgroundColor: isCurrentFloor ? '#3C5046' : '#7F8C8D',
                  transform: [{ scale: isCurrentFloor ? 1.15 : 1 }],
                  elevation: isCurrentFloor ? 6 : 3,
                }
              ]}>
                <Text style={styles.floorNumberText}>{floorNumber}</Text>
              </View>
            </TouchableOpacity>

            {/* Stage name on building */}
            <View style={[
              styles.stageLabelOnBuilding,
              { backgroundColor: isCurrentFloor ? '#3C5046' : 'rgba(60, 80, 70, 0.8)' }
            ]}>
              <Text style={styles.stageNameOnBuilding}>{stage.name}</Text>
            </View>
          </View>

          {/* Right side - Status indicator */}
          <View style={styles.floorRightInfo}>
            <View style={[
              styles.completionIndicator,
              {
                backgroundColor: stage.status === 'completed' ? '#3C5046' :
                  stage.status === 'in-progress' ? '#D4AF7C' : '#BDC3C7'
              }
            ]}>
              <Ionicons
                name={
                  stage.status === 'completed' ? 'checkmark' :
                    stage.status === 'in-progress' ? 'time' : 'ellipse'
                }
                size={16}
                color="white"
              />
            </View>
          </View>
        </Animated.View>
      );
      currentY += FLOOR_HEIGHT;
    }

    // 3. Building Base (at bottom)
    components.push(
      <Image
        key="building-base"
        source={buildingBase}
        style={[
          styles.buildingComponent,
          {
            top: currentY,
            width: buildingWidth,
            height: BASE_HEIGHT,
          }
        ]}
        resizeMode="stretch"
        fadeDuration={0}
        cache="force-cache"
      />
    );

    return components;
  };

  if (isLoading || !imagesLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3C5046" />
        <Text style={styles.loadingText}>
          {!imagesLoaded ? 'Loading images...' : 'Loading project timeline...'}
        </Text>
      </View>
    );
  }

  if (!projectId) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#E74C3C" />
        <Text style={styles.errorText}>No project selected</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonTextError}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ContainerComponent = isEmbedded ? View : ScrollView;

  return (
    <View style={isEmbedded ? { backgroundColor: 'transparent' } : styles.container}>
      {!isEmbedded && <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />}

      {/* Building Container */}
      <ContainerComponent
        style={[styles.mainContent, isEmbedded && { height: totalBuildingHeight + 250 }]}
        contentContainerStyle={!isEmbedded && styles.mainContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.buildingContainer}>
          {timelineData.stages.length === 0 ? (
            <View style={styles.emptyTimelineContainer}>
              <Ionicons name="construct-outline" size={80} color="#D4AF37" style={{ opacity: 0.5 }} />
              <Text style={styles.emptyTimelineTitle}>Schedule Pending</Text>
              <Text style={styles.emptyTimelineText}>
                The design team is currently finalizing your project timeline. Check back soon for updates!
              </Text>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.building,
                  {
                    height: totalBuildingHeight,
                    width: buildingWidth
                  }
                ]}
              >
                {renderDynamicBuilding()}

                {/* Elevator - positioned from bottom */}
                <Animated.Image
                  source={getLiftImage()}
                  style={[
                    styles.elevator,
                    {
                      height: FLOOR_HEIGHT * 0.75,
                      width: 80 * SCALE_FACTOR,
                      right: 25 * SCALE_FACTOR,
                      bottom: 0,
                      transform: [{ translateY: Animated.multiply(elevatorY, -1) }],
                    }
                  ]}
                  resizeMode="contain"
                  fadeDuration={0}
                  cache="force-cache"
                />
              </View>

              {/* Current Stage Info */}
              <View style={[styles.currentStageCard, { width: buildingWidth }]}>
                <View style={[
                  styles.currentStageIconContainer,
                  { backgroundColor: timelineData.stages[currentFloor]?.color || '#D4AF37' }
                ]}>
                  <Ionicons
                    name={timelineData.stages[currentFloor]?.icon || 'checkmark-circle-outline'}
                    size={32}
                    color="white"
                  />
                </View>
                <View style={styles.currentStageDetails}>
                  <Text style={styles.currentStageTitle}>
                    Floor {currentFloor}: {timelineData.stages[currentFloor]?.name || 'N/A'}
                  </Text>
                  <Text style={styles.currentStageDescription}>
                    {timelineData.stages[currentFloor]?.description || ''}
                  </Text>

                  {/* Progress Bar */}
                  <View style={styles.currentStageProgressBar}>
                    <View
                      style={[
                        styles.currentStageProgressFill,
                        {
                          width: `${project?.progress?.percentage || 0}%`,
                          backgroundColor: timelineData.stages[currentFloor]?.darkColor || '#D4AF37'
                        }
                      ]}
                    />
                  </View>
                  <View style={styles.progressRow}>
                    <Text style={styles.currentStageProgressText}>
                      {project?.progress?.percentage || 0}% Complete
                    </Text>
                    <Text style={styles.stageStatus}>
                      {timelineData.stages[currentFloor]?.status === 'completed' ? '✓ Completed' :
                        timelineData.stages[currentFloor]?.status === 'in-progress' ? '⏱ In Progress' :
                          '⏳ Pending'}
                    </Text>
                  </View>

                  {/* Step-specific Dates */}
                  {(timelineData.stages[currentFloor]?.startDate || timelineData.stages[currentFloor]?.endDate) && (
                    <View style={{ flexDirection: 'row', marginTop: 8, gap: 16 }}>
                      {timelineData.stages[currentFloor]?.startDate && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="play-circle-outline" size={14} color="#388E3C" />
                          <Text style={{ fontSize: 12, color: '#388E3C', marginLeft: 4 }}>
                            Start: {new Date(timelineData.stages[currentFloor].startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                      )}
                      {timelineData.stages[currentFloor]?.endDate && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="flag-outline" size={14} color="#D4AF37" />
                          <Text style={{ fontSize: 12, color: '#D4AF37', marginLeft: 4 }}>
                            End: {new Date(timelineData.stages[currentFloor].endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Project Info */}
                  {project && (
                    <View style={styles.projectMetaInfo}>
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={14} color="#7F8C8D" />
                        <Text style={styles.metaText}>
                          Start: {project.timeline?.startDate ?
                            new Date(project.timeline.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                            'N/A'}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="flag-outline" size={14} color="#7F8C8D" />
                        <Text style={styles.metaText}>
                          Target: {project.timeline?.expectedEndDate ?
                            new Date(project.timeline.expectedEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                            'N/A'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </ContainerComponent>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#3C5046',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 40,
  },
  errorText: {
    fontSize: 20,
    color: '#E74C3C',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButtonTextError: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3C5046',
    borderRadius: 8,
  },
  mainContent: {
    flex: 1,
  },
  mainContentContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    flexGrow: 1,
  },
  buildingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  building: {
    position: 'relative',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderRadius: 15,
    overflow: 'hidden',
  },
  buildingComponent: {
    position: 'absolute',
  },
  floorContainer: {
    position: 'absolute',
    width: '100%',
  },
  floorHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  floorInfo: {
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: [{ translateY: -15 }],
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  floorNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  floorNumberText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stageLabelOnBuilding: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 10,
    elevation: 2,
  },
  stageNameOnBuilding: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F5F5F0',
  },
  floorRightInfo: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -15 }],
    alignItems: 'flex-end',
    zIndex: 10,
  },
  completionIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  elevator: {
    position: 'absolute',
    zIndex: 15,
  },
  currentStageCard: {
    marginTop: 30,
    marginBottom: 40,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#3C5046',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  currentStageIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  currentStageDetails: {
    flex: 1,
  },
  currentStageTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3C5046',
    marginBottom: 4,
  },
  currentStageDescription: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 10,
  },
  currentStageProgressBar: {
    height: 5,
    backgroundColor: '#E8E8E0',
    borderRadius: 2.5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  currentStageProgressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  currentStageProgressText: {
    fontSize: 11,
    color: '#3C5046',
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageStatus: {
    fontSize: 11,
    color: '#D4AF7C',
    fontWeight: '600',
  },
  projectMetaInfo: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E0',
    gap: 15,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#3C5046',
  },
  emptyTimelineContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTimelineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3C5046',
    marginTop: 16,
  },
  emptyTimelineText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});