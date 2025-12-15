<?php

declare(strict_types=1);

namespace Truco\Game;

final class Types
{
    public const ACTION_PLAY_CARD = 'PLAY_CARD';
    public const ACTION_CALL_TRUCO = 'CALL_TRUCO';
    public const ACTION_RESPOND_TRUCO = 'RESPOND_TRUCO';
    public const ACTION_CALL_ENVIDO = 'CALL_ENVIDO';
    public const ACTION_RESPOND_ENVIDO = 'RESPOND_ENVIDO';
    public const ACTION_CALL_FLOR = 'CALL_FLOR';
    public const ACTION_RESPOND_FLOR = 'RESPOND_FLOR';
    public const ACTION_SHOW = 'SHOW';

    public const PHASE_PRE_PLAY = 'pre_play';
    public const PHASE_PLAYING = 'playing';
    public const PHASE_HAND_OVER = 'hand_over';
    public const PHASE_GAME_OVER = 'game_over';
}
