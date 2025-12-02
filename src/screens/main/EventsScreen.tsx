import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Card, VerifiedBadge } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

type EventsScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

interface Event {
  id: string;
  name: string;
  type: 'concert' | 'festival' | 'social' | 'sports' | 'university';
  image: string;
  date: string;
  location: string;
  attendeeCount: number;
  matchesCount: number;
  isAttending: boolean;
}

interface EventAttendee {
  id: string;
  name: string;
  age: number;
  photo: string;
  isVerified: boolean;
}

const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    name: 'Summer Music Festival 2024',
    type: 'festival',
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400',
    date: 'Aug 15-17, 2024',
    location: 'Central Park',
    attendeeCount: 1250,
    matchesCount: 45,
    isAttending: true,
  },
  {
    id: '2',
    name: 'Tech Networking Mixer',
    type: 'social',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
    date: 'Jul 28, 2024',
    location: 'Downtown Hub',
    attendeeCount: 180,
    matchesCount: 12,
    isAttending: false,
  },
  {
    id: '3',
    name: 'Taylor Swift Concert',
    type: 'concert',
    image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400',
    date: 'Sep 5, 2024',
    location: 'Stadium Arena',
    attendeeCount: 3500,
    matchesCount: 89,
    isAttending: false,
  },
  {
    id: '4',
    name: 'University Welcome Week',
    type: 'university',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400',
    date: 'Sep 1-7, 2024',
    location: 'State University',
    attendeeCount: 520,
    matchesCount: 34,
    isAttending: false,
  },
];

const MOCK_ATTENDEES: EventAttendee[] = [
  { id: '1', name: 'Sarah', age: 26, photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', isVerified: true },
  { id: '2', name: 'Emma', age: 24, photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', isVerified: true },
  { id: '3', name: 'Jessica', age: 28, photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100', isVerified: true },
  { id: '4', name: 'Amanda', age: 25, photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100', isVerified: true },
];

export const EventsScreen: React.FC<EventsScreenProps> = ({ navigation }) => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const eventTypes = [
    { value: 'all', label: 'All' },
    { value: 'concert', label: '🎵 Concerts' },
    { value: 'festival', label: '🎪 Festivals' },
    { value: 'social', label: '🍸 Social' },
    { value: 'university', label: '🎓 University' },
    { value: 'sports', label: '⚽ Sports' },
  ];

  const filteredEvents = filter === 'all' 
    ? MOCK_EVENTS 
    : MOCK_EVENTS.filter(e => e.type === filter);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'concert': return '🎵';
      case 'festival': return '🎪';
      case 'social': return '🍸';
      case 'university': return '🎓';
      case 'sports': return '⚽';
      default: return '📍';
    }
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => setSelectedEvent(item)}
    >
      <Image source={{ uri: item.image }} style={styles.eventImage} />
      <View style={styles.eventOverlay} />
      
      {item.isAttending && (
        <View style={styles.attendingBadge}>
          <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
          <Text style={styles.attendingText}>Attending</Text>
        </View>
      )}

      <View style={styles.eventInfo}>
        <Text style={styles.eventType}>{getTypeIcon(item.type)}</Text>
        <Text style={styles.eventName}>{item.name}</Text>
        <View style={styles.eventMeta}>
          <View style={styles.eventMetaItem}>
            <Ionicons name="calendar" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.eventMetaText}>{item.date}</Text>
          </View>
          <View style={styles.eventMetaItem}>
            <Ionicons name="location" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.eventMetaText}>{item.location}</Text>
          </View>
        </View>
        <View style={styles.eventStats}>
          <View style={styles.eventStat}>
            <Ionicons name="people" size={14} color={COLORS.primary} />
            <Text style={styles.eventStatText}>{item.attendeeCount} attending</Text>
          </View>
          <View style={styles.eventStat}>
            <Ionicons name="heart" size={14} color={COLORS.primary} />
            <Text style={styles.eventStatText}>{item.matchesCount} potential matches</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEventDetail = () => {
    if (!selectedEvent) return null;

    return (
      <View style={styles.eventDetailContainer}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setSelectedEvent(null)}
        >
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <Image source={{ uri: selectedEvent.image }} style={styles.eventDetailImage} />

        <View style={styles.eventDetailContent}>
          <Text style={styles.eventDetailName}>{selectedEvent.name}</Text>
          <View style={styles.eventDetailMeta}>
            <View style={styles.eventMetaItem}>
              <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
              <Text style={styles.eventDetailMetaText}>{selectedEvent.date}</Text>
            </View>
            <View style={styles.eventMetaItem}>
              <Ionicons name="location" size={16} color={COLORS.textSecondary} />
              <Text style={styles.eventDetailMetaText}>{selectedEvent.location}</Text>
            </View>
          </View>

          <View style={styles.matchesSection}>
            <Text style={styles.sectionTitle}>
              Potential Matches at this Event ({selectedEvent.matchesCount})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {MOCK_ATTENDEES.map((attendee) => (
                <TouchableOpacity key={attendee.id} style={styles.attendeeCard}>
                  <Image source={{ uri: attendee.photo }} style={styles.attendeePhoto} />
                  <View style={styles.attendeeInfo}>
                    <Text style={styles.attendeeName}>{attendee.name}, {attendee.age}</Text>
                    {attendee.isVerified && (
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={[
              styles.attendButton,
              selectedEvent.isAttending && styles.attendButtonActive,
            ]}
          >
            <Ionicons
              name={selectedEvent.isAttending ? 'checkmark-circle' : 'add-circle'}
              size={20}
              color={selectedEvent.isAttending ? COLORS.success : COLORS.white}
            />
            <Text
              style={[
                styles.attendButtonText,
                selectedEvent.isAttending && styles.attendButtonTextActive,
              ]}
            >
              {selectedEvent.isAttending ? 'Attending' : "I'm Going!"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Events</Text>
        <TouchableOpacity>
          <Ionicons name="add-circle" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Find and match with people attending the same events
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {eventTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.filterButton,
              filter === type.value && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(type.value)}
          >
            <Text
              style={[
                styles.filterText,
                filter === type.value && styles.filterTextActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.eventsList}
        showsVerticalScrollIndicator={false}
      />

      {selectedEvent && renderEventDetail()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    paddingBottom: SPACING.md,
  },
  filterContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background,
    marginRight: SPACING.sm,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  eventsList: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  eventCard: {
    height: 220,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  eventImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  eventOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  attendingBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  attendingText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  eventInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
  },
  eventType: {
    fontSize: 20,
    marginBottom: SPACING.xs,
  },
  eventName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  eventStats: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  eventStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.white,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  eventStatText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    fontWeight: '500',
  },
  eventDetailContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.white,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: SPACING.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  eventDetailImage: {
    width: '100%',
    height: 250,
  },
  eventDetailContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  eventDetailName: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  eventDetailMeta: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  eventDetailMetaText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  matchesSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  attendeeCard: {
    marginRight: SPACING.md,
    alignItems: 'center',
  },
  attendeePhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: SPACING.xs,
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeeName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  attendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: 'auto',
  },
  attendButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  attendButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  attendButtonTextActive: {
    color: COLORS.success,
  },
});
