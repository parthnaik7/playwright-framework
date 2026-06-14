/**
 * @file tests/api/sample-api.spec.ts
 * @description Demonstrates how to use the ApiClient service for REST API testing.
 *
 * This suite hits the free public https://jsonplaceholder.typicode.com API
 * so it needs no authentication and works out-of-the-box.
 *
 * Design:
 *  - Uses the `apiClient` fixture (injected from test-fixtures.ts).
 *  - Shows typed response handling via generics.
 *  - `HTTP_STATUS` constants replace magic status codes.
 *  - Each test group uses `test.describe` with a clear feature label.
 */

import { test, expect } from '../../src/fixtures/test-fixtures';
import { ApiClient } from '../../src/services/ApiClient';
import { HTTP_STATUS } from '../../src/config/constants';
import { Logger } from '../../src/utils/Logger';

const log = Logger.forContext('SampleApiSpec');

// ─── Response types ──────────────────────────────────────────────────────────

interface IPost {
  userId: number;
  id: number;
  title: string;
  body: string;
}

interface IComment {
  postId: number;
  id: number;
  name: string;
  email: string;
  body: string;
}

interface IUser {
  id: number;
  name: string;
  username: string;
  email: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const JSON_PLACEHOLDER = 'https://jsonplaceholder.typicode.com';

// ─────────────────────────────────────────────────────────────────────────────
// GET requests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('API — GET Requests @api', () => {
  let client: ApiClient;

  test.beforeEach(async ({ request }) => {
    // Build a dedicated client pointing at the public API
    client = new ApiClient(request, JSON_PLACEHOLDER);
  });

  test('should fetch a list of posts and return 200', async () => {
    log.step('Fetching all posts');
    const response = await client.get<IPost[]>('/posts');

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.ok).toBe(true);

    const posts = response.body;
    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBeGreaterThan(0);

    // Verify shape of first post
    const [first] = posts;
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('title');
    expect(first).toHaveProperty('userId');
    log.info(`✅ Fetched ${posts.length} posts`);
  });

  test('should fetch a single post by id and return correct data', async () => {
    const postId = 1;
    log.step(`Fetching post with id: ${postId}`);

    const response = await client.get<IPost>(`/posts/${postId}`);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.id).toBe(postId);
    expect(response.body.userId).toBeGreaterThan(0);
    expect(response.body.title).toBeTruthy();
    log.info(`✅ Post title: "${response.body.title}"`);
  });

  test('should return 404 for a non-existent post', async () => {
    log.step('Fetching non-existent post');
    const response = await client.get('/posts/99999');

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(response.ok).toBe(false);
    log.info('✅ 404 returned for non-existent resource');
  });

  test('should fetch comments for a specific post', async () => {
    const postId = 1;
    log.step(`Fetching comments for post ${postId}`);

    const response = await client.get<IComment[]>(`/posts/${postId}/comments`);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.length).toBeGreaterThan(0);

    // All comments should belong to the requested post
    for (const comment of response.body) {
      expect(comment.postId).toBe(postId);
      expect(comment.email).toContain('@');
    }
    log.info(`✅ Fetched ${response.body.length} comments for post ${postId}`);
  });

  test('should support query parameters for filtering', async () => {
    log.step('Fetching posts filtered by userId');
    const userId = 1;

    const response = await client.get<IPost[]>('/posts', {
      userId: String(userId),
    });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.length).toBeGreaterThan(0);

    // Verify all returned posts belong to the requested user
    for (const post of response.body) {
      expect(post.userId).toBe(userId);
    }
    log.info(`✅ Query param filter returned ${response.body.length} posts for user ${userId}`);
  });

  test('should return correct content-type header', async () => {
    const response = await client.get('/posts/1');

    expect(response.headers['content-type']).toContain('application/json');
    log.info('✅ Content-Type header is application/json');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST requests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('API — POST Requests @api', () => {
  let client: ApiClient;

  test.beforeEach(async ({ request }) => {
    client = new ApiClient(request, JSON_PLACEHOLDER);
  });

  test('should create a new post and return 201', async () => {
    const newPost = {
      title: 'Test Post Title',
      body: 'This is the body of the test post.',
      userId: 1,
    };

    log.step('Creating a new post');
    const response = await client.post<IPost>('/posts', newPost);

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(response.ok).toBe(true);

    expect(response.body.title).toBe(newPost.title);
    expect(response.body.body).toBe(newPost.body);
    expect(response.body.userId).toBe(newPost.userId);
    // JSONPlaceholder assigns ID 101 for new resources
    expect(response.body.id).toBeGreaterThan(0);
    log.info(`✅ Created post with id: ${response.body.id}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT requests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('API — PUT Requests @api', () => {
  let client: ApiClient;

  test.beforeEach(async ({ request }) => {
    client = new ApiClient(request, JSON_PLACEHOLDER);
  });

  test('should update an existing post and return 200', async () => {
    const updatedPost = {
      id: 1,
      title: 'Updated Title',
      body: 'Updated body content.',
      userId: 1,
    };

    log.step('Updating post id 1');
    const response = await client.put<IPost>('/posts/1', updatedPost);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.title).toBe(updatedPost.title);
    expect(response.body.body).toBe(updatedPost.body);
    log.info('✅ PUT request returned updated data');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH requests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('API — PATCH Requests @api', () => {
  let client: ApiClient;

  test.beforeEach(async ({ request }) => {
    client = new ApiClient(request, JSON_PLACEHOLDER);
  });

  test('should partially update a post title', async () => {
    log.step('Patching title of post id 1');

    const response = await client.patch<IPost>('/posts/1', {
      title: 'Patched Title Only',
    });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.title).toBe('Patched Title Only');
    log.info('✅ PATCH updated only the title field');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE requests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('API — DELETE Requests @api', () => {
  let client: ApiClient;

  test.beforeEach(async ({ request }) => {
    client = new ApiClient(request, JSON_PLACEHOLDER);
  });

  test('should delete a post and return 200', async () => {
    log.step('Deleting post id 1');

    const response = await client.delete('/posts/1');

    // JSONPlaceholder returns 200 (not 204) for DELETE
    expect(response.status).toBe(HTTP_STATUS.OK);
    log.info('✅ DELETE returned 200');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// User data
// ─────────────────────────────────────────────────────────────────────────────

test.describe('API — Users @api', () => {
  let client: ApiClient;

  test.beforeEach(async ({ request }) => {
    client = new ApiClient(request, JSON_PLACEHOLDER);
  });

  test('should fetch all users', async () => {
    const response = await client.get<IUser[]>('/users');

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.length).toBe(10);

    for (const user of response.body) {
      expect(user.id).toBeGreaterThan(0);
      expect(user.email).toContain('@');
      expect(user.name).toBeTruthy();
    }
    log.info(`✅ Fetched ${response.body.length} users — all have valid email addresses`);
  });

  test('should fetch a specific user by id', async () => {
    const userId = 3;
    const response = await client.get<IUser>(`/users/${userId}`);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.id).toBe(userId);
    log.info(`✅ Fetched user: ${response.body.name} (${response.body.email})`);
  });
});
