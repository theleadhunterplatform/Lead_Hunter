import jwt from 'jsonwebtoken';
import config from '../config';

export const generateAccessToken = (id: string): string => {
    return jwt.sign({ id }, config.jwt.accessSecret, {
        expiresIn: config.jwt.accessExpire as any
    });
};

export const generateRefreshToken = (id: string): string => {
    return jwt.sign({ id }, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpire as any
    });
};

export const generateTokenPair = (id: string) => {
    return {
        access_token: generateAccessToken(id),
        refresh_token: generateRefreshToken(id)
    };
};
