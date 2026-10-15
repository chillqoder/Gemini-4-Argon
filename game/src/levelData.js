// Explicit level data shared by authoritative collision simulation and 3D renderer

export function createLevelData() {
  // Surface ground segments: top is y = 0, bottom is y = -6
  // Pits are [4, 7] (3u), [37, 41] (4u), and [90, 93] (3u)
  const groundSegments = [
    { id: 'ground_1', minX: -62, maxX: 4, minY: -6, maxY: 0 },
    { id: 'ground_2', minX: 7, maxX: 37, minY: -6, maxY: 0 },
    { id: 'ground_3', minX: 41, maxX: 90, minY: -6, maxY: 0 },
    { id: 'ground_4', minX: 93, maxX: 156, minY: -6, maxY: 0 },
  ];

  // Pipes: x is center, y is bottom (0), width = 1.8, height = 2.0 / 2.8 / 3.4
  // Collision box is a clean vertical prism so pipe rims never trap Mario when jumping alongside.
  const pipes = [
    { id: 'pipe_1', x: -30, y: 0, width: 1.8, height: 2.0, enterable: false },
    { id: 'pipe_2', x: -20, y: 0, width: 1.8, height: 2.8, enterable: false },
    { id: 'pipe_3', x: -11, y: 0, width: 1.8, height: 3.4, enterable: false },
    {
      id: 'pipe_4',
      x: -2,
      y: 0,
      width: 1.8,
      height: 3.4,
      enterable: true,
      secretId: 'pipe_cellar',
    },
    {
      id: 'pipe_exit',
      x: 46,
      y: 0,
      width: 1.8,
      height: 2.0,
      enterable: false,
      isExitPipe: true,
    },
    { id: 'pipe_final', x: 118, y: 0, width: 1.8, height: 2.0, enterable: false },
  ];

  // Stair columns: x is center of 1-unit wide column, y=0 to height
  const stairs = [
    // Safe staircase 1 (69 to 80)
    { id: 'stair_1_a1', x: 70.5, y: 0, width: 1, height: 1 },
    { id: 'stair_1_a2', x: 71.5, y: 0, width: 1, height: 2 },
    { id: 'stair_1_a3', x: 72.5, y: 0, width: 1, height: 3 },
    { id: 'stair_1_a4', x: 73.5, y: 0, width: 1, height: 4 },
    { id: 'stair_1_d4', x: 76.5, y: 0, width: 1, height: 4 },
    { id: 'stair_1_d3', x: 77.5, y: 0, width: 1, height: 3 },
    { id: 'stair_1_d2', x: 78.5, y: 0, width: 1, height: 2 },
    { id: 'stair_1_d1', x: 79.5, y: 0, width: 1, height: 1 },

    // Gap staircase 2 around pit [90, 93] — high launch on left, forgiving lower landing on right
    { id: 'stair_2_a1', x: 85.5, y: 0, width: 1, height: 1 },
    { id: 'stair_2_a2', x: 86.5, y: 0, width: 1, height: 2 },
    { id: 'stair_2_a3', x: 87.5, y: 0, width: 1, height: 3 },
    { id: 'stair_2_a4', x: 88.5, y: 0, width: 1, height: 4 },
    { id: 'stair_2_a5', x: 89.5, y: 0, width: 1, height: 4 },
    { id: 'stair_2_d2', x: 94.5, y: 0, width: 1, height: 2 },
    { id: 'stair_2_d1', x: 95.5, y: 0, width: 1, height: 1 },

    // Final ascending staircase before flagpole (121.5 to 129.5)
    { id: 'stair_3_1', x: 121.5, y: 0, width: 1, height: 1 },
    { id: 'stair_3_2', x: 122.5, y: 0, width: 1, height: 2 },
    { id: 'stair_3_3', x: 123.5, y: 0, width: 1, height: 3 },
    { id: 'stair_3_4', x: 124.5, y: 0, width: 1, height: 4 },
    { id: 'stair_3_5', x: 125.5, y: 0, width: 1, height: 5 },
    { id: 'stair_3_6', x: 126.5, y: 0, width: 1, height: 6 },
    { id: 'stair_3_7', x: 127.5, y: 0, width: 1, height: 7 },
    { id: 'stair_3_8', x: 128.5, y: 0, width: 1, height: 8 },
    { id: 'stair_3_9', x: 129.5, y: 0, width: 1, height: 8 },

    // Flagpole base block
    { id: 'flag_base', x: 134.0, y: 0, width: 1, height: 1 },
  ];

  // Interactive blocks: x is horizontal center, y is bottom height, width=1, height=1
  // Types: 'question_coin', 'question_power', 'brick', 'multicoin', 'hidden_1up', 'star_brick'
  const blocks = [
    // Section 1: Safe opening (-60 to -35)
    { id: 'blk_open_q1', x: -47, y: 4.0, type: 'question_coin' },
    { id: 'blk_open_b1', x: -43, y: 4.0, type: 'brick' },
    { id: 'blk_open_p1', x: -42, y: 4.0, type: 'question_power' },
    { id: 'blk_open_b2', x: -41, y: 4.0, type: 'brick' },
    { id: 'blk_open_q2', x: -40, y: 4.0, type: 'question_coin' },
    { id: 'blk_open_b3', x: -39, y: 4.0, type: 'brick' },
    { id: 'blk_open_qh', x: -41, y: 7.6, type: 'question_coin' },

    // Section 2: Pipe sequence (-35 to 4) - Hidden 1-Up block between Pipe 3 (-11) and Pipe 4 (-2)
    {
      id: 'blk_secret_1up',
      x: -6.5,
      y: 4.0,
      type: 'hidden_1up',
      secretId: 'hidden_1up',
      revealed: false,
    },

    // Section 3: First gap and brick route (7 to 37)
    { id: 'blk_r1_b1', x: 14, y: 4.0, type: 'brick' },
    { id: 'blk_r1_p1', x: 15, y: 4.0, type: 'question_power' },
    { id: 'blk_r1_b2', x: 16, y: 4.0, type: 'brick' },
    { id: 'blk_r1_mc', x: 17, y: 4.0, type: 'multicoin', coinsLeft: 10 },
    { id: 'blk_r1_b3', x: 18, y: 4.0, type: 'brick' },

    // Elevated brick route (y = 7.6) with Secret #2: Star hidden in brick at x = 23
    { id: 'blk_r1_u1', x: 19, y: 7.6, type: 'brick' },
    { id: 'blk_r1_u2', x: 20, y: 7.6, type: 'brick' },
    { id: 'blk_r1_u3', x: 21, y: 7.6, type: 'brick' },
    { id: 'blk_r1_u4', x: 22, y: 7.6, type: 'brick' },
    {
      id: 'blk_secret_star',
      x: 23,
      y: 7.6,
      type: 'star_brick',
      secretId: 'star_brick',
    },
    { id: 'blk_r1_uq', x: 24, y: 7.6, type: 'question_coin' },

    // Lower trio at x = 27..29
    { id: 'blk_r1_b4', x: 27, y: 4.0, type: 'brick' },
    { id: 'blk_r1_q3', x: 28, y: 4.0, type: 'question_coin' },
    { id: 'blk_r1_b5', x: 29, y: 4.0, type: 'brick' },

    // Section 4: Middle stretch (41 to 68)
    { id: 'blk_mid_b1', x: 55, y: 4.0, type: 'brick' },
    { id: 'blk_mid_q1', x: 56, y: 4.0, type: 'question_coin' },
    { id: 'blk_mid_b2', x: 57, y: 4.0, type: 'brick' },
    { id: 'blk_mid_q2', x: 58, y: 4.0, type: 'question_coin' },
    { id: 'blk_mid_b3', x: 59, y: 4.0, type: 'brick' },

    // Upper platform in middle stretch (y = 7.6)
    { id: 'blk_mid_u1', x: 56, y: 7.6, type: 'brick' },
    { id: 'blk_mid_u2', x: 57, y: 7.6, type: 'brick' },
    { id: 'blk_mid_u3', x: 58, y: 7.6, type: 'brick' },
    { id: 'blk_mid_u4', x: 59, y: 7.6, type: 'brick' },
    { id: 'blk_mid_u5', x: 60, y: 7.6, type: 'brick' },

    // Section 6: Final approach (96 to 121)
    { id: 'blk_fin_b1', x: 100, y: 4.0, type: 'brick' },
    { id: 'blk_fin_b2', x: 101, y: 4.0, type: 'brick' },
    { id: 'blk_fin_p1', x: 102, y: 4.0, type: 'question_power' },
    { id: 'blk_fin_q1', x: 103, y: 4.0, type: 'question_coin' },
    { id: 'blk_fin_b3', x: 104, y: 4.0, type: 'brick' },
  ];

  // World coins (surface)
  const surfaceCoins = [
    // Opening jump guide
    { id: 'c_open_1', x: -51, y: 2.0 },
    { id: 'c_open_2', x: -49, y: 2.8 },

    // Pipe top and arc coins
    { id: 'c_pipe_1', x: -25.5, y: 3.8 },
    { id: 'c_pipe_2', x: -24.5, y: 4.4 },
    { id: 'c_pipe_3', x: -23.5, y: 3.8 },
    // Hint coins above Secret Pipe 4 (x = -2)
    { id: 'c_secret_hint_1', x: -2.6, y: 5.0 },
    { id: 'c_secret_hint_2', x: -1.4, y: 5.0 },

    // Gap 1 [4..7] guiding arc
    { id: 'c_gap1_1', x: 4.5, y: 2.6 },
    { id: 'c_gap1_2', x: 5.5, y: 3.4 },
    { id: 'c_gap1_3', x: 6.5, y: 2.6 },

    // Elevated brick route coins (above y = 7.6 bricks)
    { id: 'c_upper1_1', x: 19.5, y: 9.3 },
    { id: 'c_upper1_2', x: 20.5, y: 9.3 },
    { id: 'c_upper1_3', x: 21.5, y: 9.3 },
    { id: 'c_upper1_4', x: 22.5, y: 9.3 },
    { id: 'c_upper1_5', x: 23.5, y: 9.3 },

    // Gap 2 [37..41] guiding arc
    { id: 'c_gap2_1', x: 37.8, y: 2.8 },
    { id: 'c_gap2_2', x: 39.0, y: 3.8 },
    { id: 'c_gap2_3', x: 40.2, y: 2.8 },

    // Middle stretch upper coins
    { id: 'c_mid_1', x: 56.5, y: 9.3 },
    { id: 'c_mid_2', x: 58.0, y: 9.3 },
    { id: 'c_mid_3', x: 59.5, y: 9.3 },

    // Staircase 1 bridge coins
    { id: 'c_stair1_1', x: 74.5, y: 5.5 },
    { id: 'c_stair1_2', x: 75.5, y: 5.5 },

    // Gap 3 [90..93] stair jump arc
    { id: 'c_gap3_1', x: 90.8, y: 6.0 },
    { id: 'c_gap3_2', x: 91.5, y: 6.6 },
    { id: 'c_gap3_3', x: 92.2, y: 6.0 },
  ];

  // Enemies: x is center, y is feet height
  const enemies = [
    // Safe opening
    { id: 'en_goomba_1', type: 'goomba', x: -39.0, y: 0, dir: -1 },

    // Pipe sequence
    { id: 'en_goomba_2', type: 'goomba', x: -24.0, y: 0, dir: -1 },
    { id: 'en_goomba_3', type: 'goomba', x: -15.2, y: 0, dir: -1 },
    { id: 'en_goomba_4', type: 'goomba', x: -12.8, y: 0, dir: -1 },

    // First gap and brick route
    { id: 'en_goomba_5', type: 'goomba', x: 19.5, y: 0, dir: -1 },
    { id: 'en_koopa_g1', type: 'koopa_green', x: 24.5, y: 0, dir: -1 },
    { id: 'en_goomba_6', type: 'goomba', x: 31.5, y: 0, dir: -1 },
    { id: 'en_goomba_7', type: 'goomba', x: 34.0, y: 0, dir: -1 },

    // Middle stretch (includes Red Koopa on upper platform that turns at ledges)
    { id: 'en_koopa_r1', type: 'koopa_red', x: 58.0, y: 8.6, dir: -1 },
    { id: 'en_goomba_8', type: 'goomba', x: 62.0, y: 0, dir: -1 },
    { id: 'en_goomba_9', type: 'goomba', x: 64.8, y: 0, dir: -1 },

    // Staircase practice
    { id: 'en_goomba_10', type: 'goomba', x: 82.0, y: 0, dir: -1 },

    // Final approach
    { id: 'en_goomba_11', type: 'goomba', x: 107.0, y: 0, dir: -1 },
    { id: 'en_goomba_12', type: 'goomba', x: 109.5, y: 0, dir: -1 },
    { id: 'en_koopa_g2', type: 'koopa_green', x: 113.5, y: 0, dir: -1 },
  ];

  // Secret Coin Cellar data
  const cellar = {
    spawnX: -9.5,
    spawnY: 3.0,
    exitPipe: {
      id: 'cellar_exit_pipe',
      x: 9.0,
      y: 0,
      width: 1.8,
      height: 2.2,
      triggerMinX: 7.4,
      triggerMaxX: 10.0,
      triggerMaxY: 3.2,
    },
    solids: [
      // Cellar floor
      { id: 'cellar_floor', minX: -14, maxX: 14, minY: -4, maxY: 0 },
      // Left wall
      { id: 'cellar_wall_l', minX: -14, maxX: -11.5, minY: 0, maxY: 12 },
      // Right wall
      { id: 'cellar_wall_r', minX: 10.5, maxX: 14, minY: 0, maxY: 12 },
      // Ceiling
      { id: 'cellar_ceiling', minX: -14, maxX: 14, minY: 10.5, maxY: 12.5 },
      // Central brick dais holding the coin rows
      { id: 'cellar_dais', minX: -6.0, maxX: 4.0, minY: 0, maxY: 2.0 },
      // Step up to exit pipe
      { id: 'cellar_step', minX: 6.2, maxX: 8.1, minY: 0, maxY: 1.0 },
      // Exit pipe solid body
      { id: 'cellar_pipe_body', minX: 8.1, maxX: 10.5, minY: 0, maxY: 2.2 },
    ],
    coins: [],
  };

  // Populate 3 rows x 7 columns = 21 cellar coins above the central dais
  const cellarCols = [-5.0, -3.5, -2.0, -0.5, 1.0, 2.5, 3.5];
  const cellarRows = [3.2, 4.7, 6.2];
  let cellarCoinIdx = 1;
  for (const ry of cellarRows) {
    for (const cx of cellarCols) {
      cellar.coins.push({
        id: `cellar_coin_${cellarCoinIdx++}`,
        x: cx,
        y: ry,
      });
    }
  }

  return {
    playerStart: { x: -56.0, y: 0.0 },
    leftBoundary: -60.0,
    rightBoundary: 152.0,
    checkpoint: {
      x: 50.0,
      y: 0.0,
      respawnX: 50.0,
      respawnY: 0.0,
    },
    flagpole: {
      x: 134.0,
      baseY: 1.0,
      topY: 10.2,
      flagStartY: 9.4,
      flagEndY: 1.3,
    },
    castle: {
      x: 141.0,
      y: 0.0,
      doorX: 141.0,
    },
    totalSecrets: 3,
    groundSegments,
    pipes,
    stairs,
    blocks,
    surfaceCoins,
    enemies,
    cellar,
  };
}
