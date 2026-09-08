const mongoose = require('mongoose');
require('dotenv').config();
const { connectDB, disconnectDB } = require('./config/db');
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to database...');
    await connectDB();

    console.log('[Seed] Clearing existing collections...');
    await Comment.deleteMany({});
    await Post.deleteMany({});
    await User.deleteMany({});

    console.log('[Seed] Creating dummy users...');
    const users = await User.create([
      {
        username: 'alex_tech',
        email: 'alex@example.com',
        password: 'password123',
        bio: 'Tech enthusiast & full-stack developer 💻 Building cool things on the web.',
        profilePicture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      },
      {
        username: 'sarah_travels',
        email: 'sarah@example.com',
        password: 'password123',
        bio: 'Exploring the world one city at a time ✈️📸 Coffee & mountain addict.',
        profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      },
      {
        username: 'dev_rahul',
        email: 'rahul@example.com',
        password: 'password123',
        bio: 'MERN stack builder | Open source lover 🚀 Code, coffee, repeat.',
        profilePicture: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
      },
      {
        username: 'maya_art',
        email: 'maya@example.com',
        password: 'password123',
        bio: 'Digital artist & UI/UX designer 🎨✨ Clean aesthetics & typography.',
        profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      },
    ]);

    const [alex, sarah, rahul, maya] = users;

    console.log('[Seed] Setting up follower relationships...');
    // Alex follows Sarah, Rahul
    alex.following.push(sarah._id, rahul._id);
    sarah.followers.push(alex._id);
    rahul.followers.push(alex._id);

    // Sarah follows Alex, Maya
    sarah.following.push(alex._id, maya._id);
    alex.followers.push(sarah._id);
    maya.followers.push(sarah._id);

    // Rahul follows Alex, Sarah, Maya
    rahul.following.push(alex._id, sarah._id, maya._id);
    alex.followers.push(rahul._id);
    sarah.followers.push(rahul._id);
    maya.followers.push(rahul._id);

    // Maya follows Rahul
    maya.following.push(rahul._id);
    rahul.followers.push(maya._id);

    await Promise.all([alex.save(), sarah.save(), rahul.save(), maya.save()]);

    console.log('[Seed] Creating sample posts...');
    const post1 = new Post({
      user: alex._id,
      content: 'Just launched my new full-stack Mini Social Media App! 🚀 Built with Node.js, Express, MongoDB, and vanilla JavaScript. No heavy frontend framework needed!',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
      likes: [sarah._id, rahul._id],
    });

    const post2 = new Post({
      user: sarah._id,
      content: 'Sunsets in the mountains hit different 🏔️🌄 Feeling refreshed after a long weekend trek.',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
      likes: [alex._id, maya._id],
    });

    const post3 = new Post({
      user: rahul._id,
      content: 'Vanilla JavaScript in 2026 is criminally underrated. Fetch API, custom CSS variables, and modern DOM methods are all you need for lightweight responsive apps! ⚡',
      image: '',
      likes: [alex._id, sarah._id, maya._id],
    });

    const post4 = new Post({
      user: maya._id,
      content: 'Design system sneak peek: minimalist dark cards with high contrast micro-interactions. What do you think of this color palette? 🎨',
      image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
      likes: [rahul._id],
    });

    await Promise.all([post1.save(), post2.save(), post3.save(), post4.save()]);

    console.log('[Seed] Adding comments...');
    const comment1 = await Comment.create({
      post: post1._id,
      user: sarah._id,
      text: 'Congratulations Alex! Looks super slick and blazing fast 🔥',
    });

    const comment2 = await Comment.create({
      post: post1._id,
      user: rahul._id,
      text: 'Awesome work brother! Clean architecture and smooth UI 💯',
    });

    const comment3 = await Comment.create({
      post: post2._id,
      user: alex._id,
      text: 'Breathtaking view Sarah! Where was this trek?',
    });

    const comment4 = await Comment.create({
      post: post3._id,
      user: maya._id,
      text: '100% agree Rahul! Fast load times and zero bloat are top tier.',
    });

    // Link comments into posts
    post1.comments.push(comment1._id, comment2._id);
    post2.comments.push(comment3._id);
    post3.comments.push(comment4._id);

    await Promise.all([post1.save(), post2.save(), post3.save()]);

    console.log('✅ Database seeded successfully!');
    console.log('Dummy accounts created (password for all: password123):');
    console.log(' - alex@example.com (@alex_tech)');
    console.log(' - sarah@example.com (@sarah_travels)');
    console.log(' - rahul@example.com (@dev_rahul)');
    console.log(' - maya@example.com (@maya_art)');

    if (require.main === module) {
      await disconnectDB();
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Seeding error:', error);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;

