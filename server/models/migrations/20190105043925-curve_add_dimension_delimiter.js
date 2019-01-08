'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
    return Promise.all([
        queryInterface.addColumn(
            'curve',
            'dimension',
            {type: Sequelize.INTEGER, defaultValue: 1}
        ),
        queryInterface.addColumn(
            'curve',
            'delimiter',
            {type: Sequelize.STRING, defaultValue: ' '}
        )
    ])
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
    return Promise.all([
        queryInterface.removeColumn('curve', 'dimension'),
        queryInterface.removeColumn('curve', 'delimiter')
    ])
  }
};
