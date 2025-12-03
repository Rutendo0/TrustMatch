import express from 'express';
import { PrismaClient, EventCategory, EventType } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all events with filtering and search
router.get('/', async (req, res) => {
  try {
    const {
      category,
      eventType,
      isVirtual,
      city,
      latitude,
      longitude,
      radius = 50, // km
      startDate,
      endDate,
      limit = 20,
      offset = 0,
      search
    } = req.query;

    const whereClause: any = {
      isActive: true,
      startDateTime: {
        gte: startDate ? new Date(startDate as string) : new Date()
      }
    };

    if (category) {
      whereClause.category = category as EventCategory;
    }

    if (eventType) {
      whereClause.eventType = eventType as EventType;
    }

    if (isVirtual !== undefined) {
      whereClause.isVirtual = isVirtual === 'true';
    }

    if (city) {
      whereClause.city = {
        contains: city as string,
        mode: 'insensitive'
      };
    }

    if (endDate) {
      whereClause.startDateTime.lte = new Date(endDate as string);
    }

    if (search) {
      whereClause.OR = [
        {
          title: {
            contains: search as string,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search as string,
            mode: 'insensitive'
          }
        },
        {
          interestTags: {
            hasSome: [search as string]
          }
        }
      ];
    }

    // Location-based filtering (basic implementation)
    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const searchRadius = parseFloat(radius as string);

      whereClause.AND = [
        {
          latitude: {
            gte: lat - (searchRadius / 111.32), // Rough conversion
            lte: lat + (searchRadius / 111.32)
          }
        },
        {
          longitude: {
            gte: lng - (searchRadius / (111.32 * Math.cos(lat * Math.PI / 180))),
            lte: lng + (searchRadius / (111.32 * Math.cos(lat * Math.PI / 180)))
          }
        }
      ];
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { startDateTime: 'asc' },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photos: {
              where: { isMain: true },
              take: 1
            }
          }
        },
        _count: {
          select: {
            attendees: {
              where: { status: 'CONFIRMED' }
            }
          }
        }
      }
    });

    const totalCount = await prisma.event.count({ where: whereClause });

    res.json({
      success: true,
      data: events,
      pagination: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: totalCount > (parseInt(offset as string) + parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events'
    });
  }
});

// Get events by category for hub view
router.get('/hubs', async (req, res) => {
  try {
    const { category } = req.query;

    const hubEvents = await prisma.event.groupBy({
      by: ['category'],
      where: {
        isActive: true,
        startDateTime: {
          gte: new Date()
        },
        ...(category && { category: category as EventCategory })
      },
      _count: {
        id: true
      },
      _max: {
        startDateTime: true
      }
    });

    res.json({
      success: true,
      data: hubEvents
    });
  } catch (error) {
    console.error('Error fetching event hubs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event hubs'
    });
  }
});

// Get trending events based on attendance and recent creation
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const trendingEvents = await prisma.event.findMany({
      where: {
        isActive: true,
        startDateTime: {
          gte: new Date()
        }
      },
      take: parseInt(limit as string),
      orderBy: [
        { createdAt: 'desc' }, // Recent events first
      ],
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photos: {
              where: { isMain: true },
              take: 1
            }
          }
        },
        _count: {
          select: {
            attendees: {
              where: { status: 'CONFIRMED' }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: trendingEvents
    });
  } catch (error) {
    console.error('Error fetching trending events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending events'
    });
  }
});

// Get a specific event
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            bio: true,
            photos: {
              where: { isMain: true },
              take: 1
            }
          }
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photos: {
                  where: { isMain: true },
                  take: 1
                }
              }
            }
          },
          where: {
            status: 'CONFIRMED'
          },
          orderBy: {
            joinedAt: 'desc'
          }
        },
        _count: {
          select: {
            attendees: {
              where: { status: 'CONFIRMED' }
            }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event'
    });
  }
});

// Create a new event
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const {
      title,
      description,
      category,
      eventType,
      venueName,
      address,
      latitude,
      longitude,
      isVirtual,
      startDateTime,
      endDateTime,
      maxAttendees,
      isPublic,
      requiresApproval,
      interestTags,
      imageUrl,
      timezone
    } = req.body;

    const event = await prisma.event.create({
      data: {
        creatorId: userId,
        title,
        description,
        category: category as EventCategory,
        eventType: eventType as EventType,
        venueName,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        isVirtual: isVirtual || false,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
        isPublic: isPublic !== false,
        requiresApproval: requiresApproval || false,
        interestTags: interestTags || [],
        imageUrl,
        timezone: timezone || 'UTC'
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Auto-add creator as confirmed attendee
    await prisma.eventAttendee.create({
      data: {
        eventId: event.id,
        userId: userId,
        status: 'CONFIRMED'
      }
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Event created successfully'
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event'
    });
  }
});

// Update an event
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const updateData = req.body;

    // Check if user is the creator
    const existingEvent = await prisma.event.findFirst({
      where: { id, creatorId: userId, isActive: true }
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: 'Event not found or you do not have permission to update it'
      });
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...updateData,
        startDateTime: updateData.startDateTime ? new Date(updateData.startDateTime) : undefined,
        endDateTime: updateData.endDateTime ? new Date(updateData.endDateTime) : undefined,
        latitude: updateData.latitude ? parseFloat(updateData.latitude) : undefined,
        longitude: updateData.longitude ? parseFloat(updateData.longitude) : undefined,
        maxAttendees: updateData.maxAttendees ? parseInt(updateData.maxAttendees) : undefined,
        updatedAt: new Date()
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: event,
      message: 'Event updated successfully'
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event'
    });
  }
});

// RSVP to an event
router.post('/:id/rsvp', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { status = 'PENDING' } = req.body;

    const event = await prisma.event.findFirst({
      where: { id, isActive: true },
      include: {
        _count: {
          select: {
            attendees: {
              where: { status: 'CONFIRMED' }
            }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check capacity
    if (event.maxAttendees && event._count.attendees >= event.maxAttendees && status === 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        error: 'Event is at full capacity'
      });
    }

    const rsvp = await prisma.eventAttendee.upsert({
      where: {
        eventId_userId: {
          eventId: id,
          userId: userId
        }
      },
      update: {
        status: status,
        joinedAt: new Date()
      },
      create: {
        eventId: id,
        userId: userId,
        status: status
      }
    });

    res.json({
      success: true,
      data: rsvp,
      message: `RSVP ${status.toLowerCase()} submitted successfully`
    });
  } catch (error) {
    console.error('Error submitting RSVP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit RSVP'
    });
  }
});

// Cancel RSVP
router.delete('/:id/rsvp', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    await prisma.eventAttendee.delete({
      where: {
        eventId_userId: {
          eventId: id,
          userId: userId
        }
      }
    });

    res.json({
      success: true,
      message: 'RSVP cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling RSVP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel RSVP'
    });
  }
});

// Get user's events (created and attending)
router.get('/user/my-events', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;

    const [createdEvents, attendingEvents] = await Promise.all([
      prisma.event.findMany({
        where: { creatorId: userId, isActive: true },
        include: {
          _count: {
            select: {
              attendees: {
                where: { status: 'CONFIRMED' }
              }
            }
          }
        },
        orderBy: { startDateTime: 'asc' }
      }),
      prisma.event.findMany({
        where: {
          attendees: {
            some: {
              userId: userId,
              status: 'CONFIRMED'
            }
          },
          isActive: true
        },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              attendees: {
                where: { status: 'CONFIRMED' }
              }
            }
          }
        },
        orderBy: { startDateTime: 'asc' }
      })
    ]);

    res.json({
      success: true,
      data: {
        created: createdEvents,
        attending: attendingEvents
      }
    });
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user events'
    });
  }
});

// Delete an event
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const existingEvent = await prisma.event.findFirst({
      where: { id, creatorId: userId, isActive: true }
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: 'Event not found or you do not have permission to delete it'
      });
    }

    await prisma.event.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event'
    });
  }
});

export default router;