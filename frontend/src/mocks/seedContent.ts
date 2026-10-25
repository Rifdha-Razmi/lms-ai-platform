// Seed course content for the mock backend.
// Transcripts are real, short lecture texts so the mock RAG tutor,
// summaries, flashcards and auto-quiz all have something to ground on.

import type { Difficulty } from '@/types';

export interface LectureSpec {
  title: string;
  minutes: number;
  transcript: string;
}
export interface ModuleSpec {
  title: string;
  lectures: LectureSpec[];
}
export interface CourseSpec {
  id: string;
  instructor: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  rating: number;
  rating_count: number;
  enrollment_count: number;
  created_at: string;
  modules: ModuleSpec[];
}

export const VIDEO_POOL = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
];

export const COURSE_SPECS: CourseSpec[] = [
  {
    id: 'c-dsa',
    instructor: 'u-rohit',
    title: 'Data Structures & Algorithms in Practice',
    description:
      'Learn the data structures and algorithms that show up in real interviews and real codebases. We start from complexity analysis, work through sorting and searching, and finish with trees and graphs — always asking why an approach is fast, not just that it is.',
    category: 'Computer Science',
    difficulty: 'intermediate',
    price: 0,
    status: 'approved',
    rating: 4.8,
    rating_count: 1284,
    enrollment_count: 5230,
    created_at: '2026-06-02T09:00:00Z',
    modules: [
      {
        title: 'Complexity Analysis',
        lectures: [
          {
            title: 'Big-O Notation Without the Fear',
            minutes: 14,
            transcript:
              'Big-O notation describes how the running time of an algorithm grows as the input size grows. We drop constants and lower order terms because they stop mattering for large inputs. A loop over n items is O(n), and a loop nested inside another loop over the same items is O(n^2). Logarithmic time, O(log n), appears whenever we halve the problem at each step, as in binary search. Big-O is an upper bound, so it describes the worst case unless we say otherwise.',
          },
          {
            title: 'Space Complexity and Trade-offs',
            minutes: 11,
            transcript:
              'Space complexity measures the extra memory an algorithm needs beyond its input. Recursion uses stack space, so a recursive function that goes n levels deep uses O(n) space. A hash map can turn an O(n^2) search into O(n) time by spending O(n) extra memory. This is the classic time-space trade-off: we often buy speed with memory. Always state both time and space complexity when you explain a solution.',
          },
        ],
      },
      {
        title: 'Sorting Algorithms',
        lectures: [
          {
            title: 'Sorting Algorithms - Part 1: Merge Sort',
            minutes: 16,
            transcript:
              'Merge sort is a divide and conquer algorithm. It splits the array in half, recursively sorts each half, and then merges the two sorted halves. The merge step walks both halves with two pointers and takes the smaller element each time. Merge sort always runs in O(n log n) time, regardless of the input order. Its drawback is that the merge step needs O(n) auxiliary space. Merge sort is stable, meaning equal elements keep their original relative order.',
          },
          {
            title: 'Sorting Algorithms - Part 2: Quicksort',
            minutes: 18,
            transcript:
              'Quicksort picks a pivot element and partitions the array so that smaller elements go left of the pivot and larger elements go right. It then recursively sorts the two partitions. On average quicksort runs in O(n log n) time and sorts in place. Quicksort degrades to O(n^2) when the pivot is always the smallest or largest element, which happens on already sorted input if we always choose the first or last element as the pivot. Choosing a random pivot or the median of three avoids this worst case in practice. Quicksort is not stable by default.',
          },
          {
            title: 'Binary Search and Its Variants',
            minutes: 12,
            transcript:
              'Binary search finds a target in a sorted array by comparing it with the middle element and discarding half of the remaining range each time. Because the range halves at every step, binary search runs in O(log n) time. The most common bug is an off by one error in the loop condition or in updating the low and high pointers. Variants of binary search find the first or last occurrence of a value, or the smallest value that satisfies a condition. Binary search only works when the data is sorted or the condition is monotonic.',
          },
        ],
      },
      {
        title: 'Trees and Graphs',
        lectures: [
          {
            title: 'Binary Search Trees',
            minutes: 15,
            transcript:
              'A binary search tree keeps every node greater than all values in its left subtree and smaller than all values in its right subtree. Search, insert and delete take O(h) time where h is the height of the tree. A balanced tree has height O(log n), but inserting sorted data into a plain binary search tree creates a skewed tree with height O(n). Self balancing trees such as AVL trees and red black trees rotate nodes to keep the height logarithmic. An in-order traversal of a binary search tree visits the values in sorted order.',
          },
          {
            title: 'Graph Traversal: BFS and DFS',
            minutes: 17,
            transcript:
              'A graph is a set of vertices connected by edges, and we usually store it as an adjacency list. Breadth first search explores the graph level by level using a queue, so it finds the shortest path in an unweighted graph. Depth first search goes as deep as possible along one branch before backtracking, using recursion or an explicit stack. Both BFS and DFS run in O(V + E) time, where V is the number of vertices and E the number of edges. Always keep a visited set, otherwise cycles will make the traversal loop forever. DFS is the basis for topological sort and cycle detection.',
          },
        ],
      },
    ],
  },
  {
    id: 'c-react',
    instructor: 'u-kavya',
    title: 'Modern React with TypeScript',
    description:
      'Build production-grade React apps with TypeScript. Components, hooks, state, data fetching and testing — taught through a single project you grow every module.',
    category: 'Web Development',
    difficulty: 'beginner',
    price: 1499,
    status: 'approved',
    rating: 4.7,
    rating_count: 932,
    enrollment_count: 3810,
    created_at: '2026-05-14T09:00:00Z',
    modules: [
      {
        title: 'Components and Props',
        lectures: [
          {
            title: 'Thinking in Components',
            minutes: 12,
            transcript:
              'A React component is a function that takes props and returns JSX describing the UI. Components should be small and focused on one responsibility so they are easy to reuse and test. Props flow down from parent to child and are read only inside the child. TypeScript lets us describe the shape of props with an interface, so mistakes are caught before the code runs. Composition, passing components as children, is preferred over inheritance in React.',
          },
          {
            title: 'Lists, Keys and Conditional Rendering',
            minutes: 10,
            transcript:
              'When rendering a list we map over an array and return an element for each item. Every item in a list needs a stable key so React can match elements between renders. Using the array index as a key causes bugs when items are reordered or removed. Conditional rendering uses the ternary operator or logical and to show different UI for different states. Always design the empty state and loading state, not only the happy path.',
          },
        ],
      },
      {
        title: 'State and Hooks',
        lectures: [
          {
            title: 'useState and useEffect',
            minutes: 16,
            transcript:
              'The useState hook stores a value that persists between renders and triggers a re-render when it changes. State updates are asynchronous and batched, so use the functional updater when the new value depends on the previous one. The useEffect hook runs side effects after render, such as subscriptions or timers. The dependency array controls when the effect runs again, and a missing dependency causes stale values. Return a cleanup function from useEffect to remove listeners and avoid memory leaks.',
          },
          {
            title: 'Data Fetching with TanStack Query',
            minutes: 14,
            transcript:
              'TanStack Query manages server state: fetching, caching, retries and background refetching. A query is identified by a query key, and data with the same key is shared across components. Mutations change data on the server, and after a mutation we invalidate related queries so they refetch. The staleTime option controls how long cached data is considered fresh. Separating server state from client state keeps global stores like Zustand small.',
          },
        ],
      },
    ],
  },
  {
    id: 'c-ml',
    instructor: 'u-rohit',
    title: 'Machine Learning Foundations',
    description:
      'From linear regression to evaluation metrics: the core ideas behind supervised learning, explained with intuition first and math second.',
    category: 'Data Science',
    difficulty: 'intermediate',
    price: 2499,
    status: 'approved',
    rating: 4.6,
    rating_count: 641,
    enrollment_count: 2950,
    created_at: '2026-04-20T09:00:00Z',
    modules: [
      {
        title: 'Supervised Learning',
        lectures: [
          {
            title: 'Linear Regression Intuition',
            minutes: 15,
            transcript:
              'Linear regression fits a straight line that predicts a continuous target from input features. The model learns weights that minimise the mean squared error between predictions and true values. Gradient descent updates the weights step by step in the direction that reduces the loss. The learning rate controls the size of each step; too large and training diverges, too small and it is slow. Feature scaling helps gradient descent converge faster.',
          },
          {
            title: 'Classification and Logistic Regression',
            minutes: 13,
            transcript:
              'Classification predicts a category instead of a number. Logistic regression passes a linear combination of features through the sigmoid function to output a probability between zero and one. We train it by minimising cross entropy loss. A decision threshold, usually 0.5, turns the probability into a class label. Moving the threshold trades precision against recall.',
          },
        ],
      },
      {
        title: 'Model Evaluation',
        lectures: [
          {
            title: 'Overfitting and Validation',
            minutes: 12,
            transcript:
              'Overfitting happens when a model memorises the training data and performs poorly on new data. We detect it by holding out a validation set that the model never trains on. Cross validation repeats this split several times to get a more reliable estimate. Regularisation such as L1 and L2 penalties discourages overly complex models. More training data is often the most effective cure for overfitting.',
          },
          {
            title: 'Precision, Recall and F1',
            minutes: 11,
            transcript:
              'Accuracy is misleading when classes are imbalanced. Precision is the fraction of predicted positives that are actually positive. Recall is the fraction of actual positives that the model found. The F1 score is the harmonic mean of precision and recall. A confusion matrix shows true positives, false positives, true negatives and false negatives in one table.',
          },
        ],
      },
    ],
  },
  {
    id: 'c-sql',
    instructor: 'u-kavya',
    title: 'SQL for Analysts',
    description:
      'Query, join and aggregate real datasets with confidence. No prior database experience needed.',
    category: 'Databases',
    difficulty: 'beginner',
    price: 0,
    status: 'approved',
    rating: 4.5,
    rating_count: 2210,
    enrollment_count: 8120,
    created_at: '2026-03-01T09:00:00Z',
    modules: [
      {
        title: 'Querying Basics',
        lectures: [
          {
            title: 'SELECT, WHERE and ORDER BY',
            minutes: 10,
            transcript:
              'SELECT chooses which columns to return and FROM chooses the table. WHERE filters rows using conditions such as equals, greater than and LIKE. ORDER BY sorts the result ascending by default or descending with DESC. LIMIT restricts how many rows come back. Always filter as early as possible to keep queries fast.',
          },
          {
            title: 'Joins Explained',
            minutes: 14,
            transcript:
              'An INNER JOIN returns only rows that have matching keys in both tables. A LEFT JOIN keeps every row from the left table and fills missing matches with NULL. Joins usually match a foreign key in one table to a primary key in another. Joining on a non unique column can multiply rows unexpectedly. Indexes on join columns make joins much faster.',
          },
        ],
      },
      {
        title: 'Aggregation',
        lectures: [
          {
            title: 'GROUP BY and HAVING',
            minutes: 12,
            transcript:
              'GROUP BY collapses rows that share a value into one summary row. Aggregate functions such as COUNT, SUM and AVG compute a value per group. HAVING filters groups after aggregation, while WHERE filters rows before it. Every selected column must either be grouped or aggregated. Window functions compute aggregates without collapsing rows.',
          },
        ],
      },
    ],
  },
  {
    id: 'c-sysdesign',
    instructor: 'u-rohit',
    title: 'System Design Essentials',
    description:
      'Design systems that scale: load balancing, caching, databases, queues and the trade-offs between them.',
    category: 'Computer Science',
    difficulty: 'advanced',
    price: 2999,
    status: 'approved',
    rating: 4.9,
    rating_count: 418,
    enrollment_count: 1740,
    created_at: '2026-07-10T09:00:00Z',
    modules: [
      {
        title: 'Scaling Fundamentals',
        lectures: [
          {
            title: 'Horizontal vs Vertical Scaling',
            minutes: 13,
            transcript:
              'Vertical scaling adds more CPU or memory to a single machine and eventually hits a hardware limit. Horizontal scaling adds more machines behind a load balancer. Stateless services are easy to scale horizontally because any instance can serve any request. Session data should live in a shared store such as Redis rather than in server memory. A load balancer also improves availability by routing around failed instances.',
          },
          {
            title: 'Caching Strategies',
            minutes: 15,
            transcript:
              'A cache stores the results of expensive reads so later requests are served faster. Cache aside means the application reads from the cache first and loads from the database on a miss. Every cached value needs a time to live or an invalidation rule, otherwise users see stale data. A CDN caches static assets such as video close to users. Caching is most effective for read heavy data that changes rarely.',
          },
        ],
      },
      {
        title: 'Asynchronous Processing',
        lectures: [
          {
            title: 'Message Queues and Background Jobs',
            minutes: 14,
            transcript:
              'A message queue decouples the producer of work from the consumer that processes it. Slow tasks such as video transcription, email and PDF generation should run as background jobs. Workers pull jobs from the queue and can be scaled independently of the web servers. Jobs should be idempotent so retrying a failed job does not cause duplicate effects. Redis with BullMQ or Celery are common job queue choices.',
          },
        ],
      },
    ],
  },
  {
    id: 'c-writing',
    instructor: 'u-kavya',
    title: 'Technical Writing for Engineers',
    description: 'Write design docs, READMEs and PR descriptions that people actually read.',
    category: 'Communication',
    difficulty: 'beginner',
    price: 499,
    status: 'approved',
    rating: 4.4,
    rating_count: 305,
    enrollment_count: 1120,
    created_at: '2026-02-11T09:00:00Z',
    modules: [
      {
        title: 'Writing Clearly',
        lectures: [
          {
            title: 'Know Your Reader',
            minutes: 9,
            transcript:
              'Good technical writing starts by deciding who the reader is and what they need to do next. Put the most important information first so a busy reader can stop early. Use short sentences and plain words instead of jargon. Examples make abstract ideas concrete. Every document should have one clear purpose.',
          },
          {
            title: 'Writing a Great README',
            minutes: 11,
            transcript:
              'A README should explain what the project does, how to install it and how to run it in the first screen. Include a quick start with copy and paste commands. Document environment variables and their defaults. Add a section on how to run the tests. Keep the README updated whenever setup steps change.',
          },
        ],
      },
    ],
  },
  {
    id: 'c-devops',
    instructor: 'u-kavya',
    title: 'Cloud & DevOps Basics',
    description: 'Docker, CI/CD pipelines and deploying your first service to the cloud.',
    category: 'DevOps',
    difficulty: 'beginner',
    price: 999,
    status: 'pending',
    rating: 0,
    rating_count: 0,
    enrollment_count: 0,
    created_at: '2026-10-15T09:00:00Z',
    modules: [
      {
        title: 'Containers',
        lectures: [
          {
            title: 'Docker in 15 Minutes',
            minutes: 15,
            transcript:
              'A container packages an application with its dependencies so it runs the same everywhere. A Dockerfile lists the steps to build an image. Images are built in layers and cached, so ordering steps well speeds up builds. Docker Compose runs several containers together for local development.',
          },
        ],
      },
    ],
  },
  {
    id: 'c-prompt',
    instructor: 'u-rohit',
    title: 'Prompt Engineering for Developers',
    description: 'Design reliable prompts, evaluate outputs and build retrieval-augmented features.',
    category: 'Data Science',
    difficulty: 'intermediate',
    price: 1999,
    status: 'pending',
    rating: 0,
    rating_count: 0,
    enrollment_count: 0,
    created_at: '2026-10-18T09:00:00Z',
    modules: [
      {
        title: 'Retrieval-Augmented Generation',
        lectures: [
          {
            title: 'What RAG Solves',
            minutes: 12,
            transcript:
              'Retrieval augmented generation retrieves relevant documents and adds them to the prompt so the model answers from trusted sources. Documents are split into chunks and turned into embeddings. A vector search finds the chunks most similar to the question. Citing sources lets users verify the answer.',
          },
        ],
      },
    ],
  },
];

export const CATEGORIES = [
  'Computer Science',
  'Web Development',
  'Data Science',
  'Databases',
  'DevOps',
  'Communication',
];

export const STUDENT_NAMES = [
  'Ishaan Verma',
  'Fathima Nusra',
  'Arjun Nair',
  'Sneha Pillai',
  'Mohamed Rizwan',
  'Divya Krishnan',
  'Karthik Raman',
  'Aisha Farook',
  'Nikhil Joshi',
  'Tharushi Perera',
  'Vikram Rao',
  'Lakshmi Iyer',
];
