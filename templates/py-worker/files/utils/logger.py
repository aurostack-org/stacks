"""
@File: logger.py
@Version: 1.1

Logger wrapper to manage logs in one place with log rotate. Records also go to
stdout, so `docker logs` shows them.

Logger('daily') will create daily.log file in the logs folder
Logger('my.daily') will create my.daily.log file in the logs folder

If it is necessary to store the log files in the separate folder set the second parameter 'module'

Logger('daily', 'criteo') will create daily.log file in the logs/criteo folder

Usage example:

from utils.logger import Logger

logger = Logger('my.daily')

logger.info('Logging info entry.')
logger.debug('Logging debug entry.')
logger.warning('Logging warning entry.')
logger.critical('Logging critical entry.')
logger.error('Logging error entry.')

If needed to print the trace info about some exception, just add second parameter 'exc_info' to the function like so:

try:
    ....
except Exception as e:
    logger.error('Error in the code', exc_info=e)

"""

import logging
import os
import pathlib
import sys
from logging import handlers

from config import CONFIG


class Logger(object):

    def __init__(self, name, module=None):
        directory = f"{CONFIG.path.logs}"
        logger_name = name

        if module is not None:
            directory = f"{directory}/{module}"
            logger_name = f"{module}_{name}"
        pathlib.Path(directory).mkdir(parents=True, exist_ok=True)

        filename = f"{directory}/{name}.log"
        formatter = "%(asctime)s %(levelname)-10s %(message)s"

        self.logger = logging.getLogger(logger_name)
        self.logger.setLevel(logging.DEBUG)

        # make sure to add RotatingFileHandler only once
        # you might need to update condition if you have more than 1 handler
        if not self.logger.handlers:
            handler = handlers.RotatingFileHandler(
                filename,
                mode='a',
                maxBytes=100000,
                backupCount=5,
                encoding=None,
                delay=False
            )
            handler.setLevel(logging.DEBUG)
            formatter = logging.Formatter(
                formatter, datefmt='%Y-%m-%d %H:%M:%S')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)

            console = logging.StreamHandler(sys.stdout)
            console.setLevel(logging.INFO)
            console.setFormatter(formatter)
            self.logger.addHandler(console)

    def debug(self, message, exc_info=None):
        self.__call(self.logger.debug, message, exc_info)

    def info(self, message, exc_info=None):
        self.__call(self.logger.info, message, exc_info)

    def warning(self, message, exc_info=None):
        self.__call(self.logger.warning, message, exc_info)

    def error(self, message, exc_info=None):
        self.__call(self.logger.error, message, exc_info)

    def critical(self, message, exc_info=None):
        self.__call(self.logger.critical, message, exc_info)

    @staticmethod
    def __call(method, message, exc_info=None):
        if exc_info is not None:
            method(message, exc_info=exc_info)
        else:
            method(message)
